/**
 * Reino de Luz — YouTube live-status Worker
 *
 * Keyless live detection: fetches the channel's public /live page server-side
 * (browsers can't do this due to CORS) and reports whether a stream is on air.
 * The result is edge-cached so YouTube is only hit at most once per CACHE_SECONDS,
 * no matter how many visitors load the site.
 *
 * Response: { "live": true } or { "live": false }
 */

const CHANNEL_ID = 'UC3kfwg4h0cpsGh_7Rsgk9LQ';
const CACHE_SECONDS = 120; // check YouTube at most every 2 minutes total

export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    const cacheKey = new Request('https://live-status.internal/' + CHANNEL_ID);

    let response = await cache.match(cacheKey);
    if (response) return response;

    let live = false;
    try {
      const yt = await fetch('https://www.youtube.com/channel/' + CHANNEL_ID + '/live', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          // Skip the EU cookie-consent interstitial so we always get the real page.
          'Cookie': 'CONSENT=YES+cb'
        }
      });
      const html = await yt.text();
      // These markers only appear while a broadcast is actually on air.
      live = html.includes('"isLive":true') || html.includes('"isLiveNow":true');
    } catch (e) {
      live = false;
    }

    response = new Response(JSON.stringify({ live }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=' + CACHE_SECONDS
      }
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
