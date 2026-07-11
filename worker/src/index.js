/**
 * Reino de Luz — live status + web push notifications
 *
 * GET  /                 → { live: boolean }
 * GET  /vapid-public-key → { publicKey: string }
 * POST /subscribe        → store PushSubscription JSON
 * POST /unsubscribe      → remove PushSubscription by endpoint
 *
 * Cron (every 2 min): detect live→offline transitions and notify subscribers.
 */

import { buildPushHTTPRequest } from '@pushforge/builder';

const CHANNEL_ID = 'UC3kfwg4h0cpsGh_7Rsgk9LQ';
const CACHE_SECONDS = 120;
const LAST_LIVE_KEY = 'meta:last-live';
const SUB_PREFIX = 'sub:';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extra,
    },
  });
}

async function hashEndpoint(endpoint) {
  const data = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkYouTubeLive() {
  try {
    const yt = await fetch('https://www.youtube.com/channel/' + CHANNEL_ID + '/live', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb',
      },
    });
    const html = await yt.text();
    return html.includes('"isLive":true') || html.includes('"isLiveNow":true');
  } catch {
    return false;
  }
}

async function getCachedLive(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request('https://live-status.internal/' + CHANNEL_ID);
  let response = await cache.match(cacheKey);
  if (response) {
    const data = await response.clone().json();
    return { live: !!data.live, response };
  }

  const live = await checkYouTubeLive();
  response = json({ live }, 200, {
    'Cache-Control': 'public, max-age=' + CACHE_SECONDS,
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return { live, response };
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
  let sub;
  try {
    sub = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!isValidSubscription(sub)) return json({ error: 'Invalid subscription' }, 400);

  const id = await hashEndpoint(sub.endpoint);
  await env.PUSH_SUBS.put(SUB_PREFIX + id, JSON.stringify(sub));
  return json({ ok: true });
}

async function handleUnsubscribe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body || typeof body.endpoint !== 'string') {
    return json({ error: 'Missing endpoint' }, 400);
  }
  const id = await hashEndpoint(body.endpoint);
  await env.PUSH_SUBS.delete(SUB_PREFIX + id);
  return json({ ok: true });
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

  const privateJWK = JSON.parse(env.VAPID_PRIVATE_KEY);
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
      return new Response(null, { status: 204, headers: corsHeaders });
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
        { 'Cache-Control': 'public, max-age=86400' }
      );
    }

    if (request.method === 'POST' && path === '/subscribe') {
      return handleSubscribe(request, env);
    }

    if (request.method === 'POST' && path === '/unsubscribe') {
      return handleUnsubscribe(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(controller, env, ctx) {
    const live = await checkYouTubeLive();
    // Refresh edge cache used by the public /live endpoint
    const cache = caches.default;
    const cacheKey = new Request('https://live-status.internal/' + CHANNEL_ID);
    const response = json({ live }, 200, {
      'Cache-Control': 'public, max-age=' + CACHE_SECONDS,
    });
    ctx.waitUntil(cache.put(cacheKey, response));
    ctx.waitUntil(syncLiveAndMaybeNotify(env, live));
  },
};
