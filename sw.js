/* Reino de Luz — service worker for live push notifications */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function sameOriginUrl(candidate, fallbackPath) {
  const fallback = new URL(fallbackPath || '/en-vivo.html?live=1', self.location.origin).href;
  if (!candidate || typeof candidate !== 'string') return fallback;
  try {
    const url = new URL(candidate, self.location.origin);
    if (url.origin !== self.location.origin) return fallback;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallback;
    return url.href;
  } catch (e) {
    return fallback;
  }
}

function ensureLiveWatchUrl(candidate) {
  const href = sameOriginUrl(candidate, '/en-vivo.html?live=1');
  try {
    const url = new URL(href);
    if (url.pathname.endsWith('en-vivo.html') && !url.searchParams.has('live')) {
      url.searchParams.set('live', '1');
    }
    return url.href;
  } catch (e) {
    return href;
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Reino de Luz', body: event.data ? event.data.text() : '' };
  }

  const title = typeof data.title === 'string' && data.title ? data.title : '¡Estamos en vivo!';
  const body =
    typeof data.body === 'string' && data.body
      ? data.body
      : 'Reino de Luz está transmitiendo ahora.';
  const icon = sameOriginUrl(data.icon, '/icons/icon-192.png');
  const badge = sameOriginUrl(data.badge, '/icons/icon-192.png');
  const clickUrl = ensureLiveWatchUrl(data.data && data.data.url);

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: typeof data.tag === 'string' && data.tag ? data.tag : 'rdl-live',
    renotify: data.renotify !== false,
    requireInteraction: !!data.requireInteraction,
    data: { url: clickUrl },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = ensureLiveWatchUrl(
    event.notification.data && event.notification.data.url
  );

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const targetPath = new URL(target).pathname;

      let match = null;
      for (const client of clientList) {
        try {
          const path = new URL(client.url).pathname;
          if (path === targetPath || path.endsWith('en-vivo.html')) {
            match = client;
            break;
          }
        } catch (e) {}
      }
      if (!match && clientList.length) match = clientList[0];

      if (match) {
        if (typeof match.navigate === 'function') {
          try {
            await match.navigate(target);
          } catch (e) {}
        }
        if ('focus' in match) return match.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
