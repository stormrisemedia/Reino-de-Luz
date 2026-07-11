/**
 * Reino de Luz — live status + web push notifications
 *
 * GET  /                 → { live: boolean }
 * GET  /vapid-public-key → { publicKey: string }
 * POST /subscribe        → store PushSubscription JSON
 * POST /unsubscribe      → remove PushSubscription by endpoint
 *
 * Cron (every 2 min): detect offline→live transitions and notify subscribers.
 */

import { buildPushHTTPRequest } from '@pushforge/builder';

const CHANNEL_ID = 'UC3kfwg4h0cpsGh_7Rsgk9LQ';
const CACHE_SECONDS = 120;
const LAST_LIVE_KEY = 'meta:last-live';
const SUB_PREFIX = 'sub:';

function allowedOrigins(env) {
  const site = (env.SITE_ORIGIN || 'https://reinodeluz.org').replace(/\/$/, '');
  const origins = new Set([site, site.replace('://', '://www.')]);
  if (site.includes('://www.')) origins.add(site.replace('://www.', '://'));
  origins.add('http://localhost:8787');
  origins.add('http://127.0.0.1:8787');
  origins.add('http://localhost:5500');
  origins.add('http://127.0.0.1:5500');
  // GitHub Pages fallbacks (custom domain is primary via CNAME)
  origins.add('https://stormrisemedia.github.io');
  return origins;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const site = (env.SITE_ORIGIN || 'https://reinodeluz.org').replace(/\/$/, '');
  const allowOrigin = allowed.has(origin) ? origin : site;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data, status = 200, extra = {}, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
      ...extra,
    },
  });
}

function isBrowserOriginAllowed(request, env) {
  const origin = request.headers.get('Origin');
  // Non-browser clients (no Origin) are still subject to endpoint validation;
  // browser cross-origin calls must come from an allowlisted site.
  if (!origin) return true;
  return allowedOrigins(env).has(origin);
}

async function hashEndpoint(endpoint) {
  const data = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkYouTubeLive() {
  try {
    const yt = await fetch('https://www.youtube.com/channel/' + CHANNEL_ID + '/live', {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb',
      },
    });
    if (!yt.ok) {
      return { ok: false, live: false };
    }

    // When offline, /live often lands on the channel page (no watch URL).
    // When live, it typically redirects to /watch?v=VIDEO_ID.
    const finalUrl = yt.url || '';
    const videoId = (finalUrl.match(/[?&]v=([\w-]{11})/) || [])[1];
    if (!videoId) {
      return { ok: true, live: false };
    }

    const html = await yt.text();
    // Prefer isLiveNow — bare "isLive":true also appears in related/recommended JSON.
    const live =
      html.includes('"isLiveNow":true') ||
      (html.includes('"isLive":true') && html.includes('"isLiveContent":true'));
    return { ok: true, live };
  } catch {
    return { ok: false, live: false };
  }
}

function liveStatusBody(live) {
  return new Response(JSON.stringify({ live: !!live }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=' + CACHE_SECONDS,
    },
  });
}

async function getCachedLive(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request('https://live-status.internal/' + CHANNEL_ID);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const data = await cached.json();
    const live = !!data.live;
    return {
      live,
      response: json({ live }, 200, { 'Cache-Control': 'public, max-age=' + CACHE_SECONDS }, request, env),
    };
  }

  const result = await checkYouTubeLive();
  // On scrape failure, serve offline without caching so the next request can retry.
  if (!result.ok) {
    return { live: false, response: json({ live: false }, 200, {}, request, env) };
  }

  ctx.waitUntil(cache.put(cacheKey, liveStatusBody(result.live)));
  return {
    live: result.live,
    response: json({ live: result.live }, 200, {
      'Cache-Control': 'public, max-age=' + CACHE_SECONDS,
    }, request, env),
  };
}

function isValidSubscription(sub) {
  return (
    sub &&
    typeof sub.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string'
  );
}

async function handleSubscribe(request, env) {
  if (!isBrowserOriginAllowed(request, env)) {
    return json({ error: 'Origin not allowed' }, 403, {}, request, env);
  }
  let sub;
  try {
    sub = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, {}, request, env);
  }
  if (!isValidSubscription(sub)) return json({ error: 'Invalid subscription' }, 400, {}, request, env);

  const id = await hashEndpoint(sub.endpoint);
  await env.PUSH_SUBS.put(SUB_PREFIX + id, JSON.stringify(sub));
  return json({ ok: true }, 200, {}, request, env);
}

async function handleUnsubscribe(request, env) {
  if (!isBrowserOriginAllowed(request, env)) {
    return json({ error: 'Origin not allowed' }, 403, {}, request, env);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, {}, request, env);
  }
  if (!body || typeof body.endpoint !== 'string') {
    return json({ error: 'Missing endpoint' }, 400, {}, request, env);
  }
  const id = await hashEndpoint(body.endpoint);
  await env.PUSH_SUBS.delete(SUB_PREFIX + id);
  return json({ ok: true }, 200, {}, request, env);
}

async function listSubscriptions(env) {
  const subs = [];
  let cursor;
  do {
    const page = await env.PUSH_SUBS.list({ prefix: SUB_PREFIX, cursor });
    for (const key of page.keys) {
      const raw = await env.PUSH_SUBS.get(key.name);
      if (!raw) continue;
      try {
        subs.push({ key: key.name, sub: JSON.parse(raw) });
      } catch {
        await env.PUSH_SUBS.delete(key.name);
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return subs;
}

async function notifySubscribers(env, live) {
  if (!live) return { sent: 0, removed: 0 };
  if (!env.VAPID_PRIVATE_KEY) {
    console.log('VAPID_PRIVATE_KEY secret missing; skip notify');
    return { sent: 0, removed: 0 };
  }

  let privateJWK;
  try {
    privateJWK = JSON.parse(env.VAPID_PRIVATE_KEY);
  } catch (err) {
    console.log('VAPID_PRIVATE_KEY is not valid JSON; skip notify', err && err.message);
    return { sent: 0, removed: 0 };
  }

  const site = (env.SITE_ORIGIN || 'https://reinodeluz.org').replace(/\/$/, '');
  const payload = {
    title: '¡Estamos en vivo!',
    body: 'Asociación Reino de Luz está transmitiendo ahora. Únete a la transmisión.',
    icon: site + '/reinodeluzlogo.png',
    badge: site + '/reinodeluzlogo.png',
    tag: 'rdl-live',
    renotify: true,
    requireInteraction: false,
    data: { url: site + '/en-vivo.html' },
  };

  const entries = await listSubscriptions(env);
  let sent = 0;
  let removed = 0;

  for (const { key, sub } of entries) {
    try {
      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK,
        subscription: sub,
        message: {
          payload,
          adminContact: env.VAPID_SUBJECT || 'mailto:contacto@reinodeluz.org',
          options: { ttl: 3600, urgency: 'high', topic: 'rdl-live' },
        },
      });
      const res = await fetch(endpoint, { method: 'POST', headers, body });
      if (res.status === 404 || res.status === 410) {
        await env.PUSH_SUBS.delete(key);
        removed++;
      } else if (res.ok || res.status === 201) {
        sent++;
      } else {
        console.log('Push failed', res.status, await res.text());
      }
    } catch (err) {
      console.log('Push error', err && err.message);
    }
  }

  return { sent, removed };
}

async function syncLiveAndMaybeNotify(env, live) {
  const prev = await env.PUSH_SUBS.get(LAST_LIVE_KEY);
  const wasLive = prev === 'true';
  const next = live ? 'true' : 'false';

  // Only write when status changes — avoids burning free KV write quota every cron tick.
  if (prev !== next) {
    await env.PUSH_SUBS.put(LAST_LIVE_KEY, next);
  }

  if (live && !wasLive) {
    return notifySubscribers(env, true);
  }
  return { sent: 0, removed: 0, skipped: true };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    if (request.method === 'GET' && (path === '/' || path === '/live')) {
      const { response } = await getCachedLive(request, env, ctx);
      return response;
    }

    if (request.method === 'GET' && path === '/vapid-public-key') {
      return json(
        { publicKey: env.VAPID_PUBLIC_KEY || '' },
        200,
        { 'Cache-Control': 'public, max-age=86400' },
        request,
        env
      );
    }

    if (request.method === 'POST' && path === '/subscribe') {
      return handleSubscribe(request, env);
    }

    if (request.method === 'POST' && path === '/unsubscribe') {
      return handleUnsubscribe(request, env);
    }

    return json({ error: 'Not found' }, 404, {}, request, env);
  },

  async scheduled(controller, env, ctx) {
    const result = await checkYouTubeLive();
    // Don't treat scrape failures as "went offline" — that caused duplicate push alerts.
    if (!result.ok) {
      console.log('YouTube live check failed; skipping cache/KV update');
      return;
    }

    const live = result.live;
    // Refresh edge cache used by the public /live endpoint
    const cache = caches.default;
    const cacheKey = new Request('https://live-status.internal/' + CHANNEL_ID);
    ctx.waitUntil(cache.put(cacheKey, liveStatusBody(live)));
    ctx.waitUntil(syncLiveAndMaybeNotify(env, live));
  },
};
