/* Reino de Luz — service worker for live push notifications */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Reino de Luz', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '¡Estamos en vivo!';
  const options = {
    body: data.body || 'Asociación Reino de Luz está transmitiendo ahora.',
    icon: data.icon || '/reinodeluzlogo.png',
    badge: data.badge || '/reinodeluzlogo.png',
    tag: data.tag || 'rdl-live',
    renotify: data.renotify !== false,
    requireInteraction: !!data.requireInteraction,
    data: data.data || { url: '/en-vivo.html' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/en-vivo.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const targetPath = (() => {
        try {
          return new URL(target, self.location.origin).pathname;
        } catch (e) {
          return '/en-vivo.html';
        }
      })();

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
