// Service worker for the Activity dashboard. It exists for push: iOS only
// delivers Web Push to a PWA that has been added to the Home Screen, and only
// through a service worker registered on that page's scope.
//
// Deliberately no fetch handler. Caching an admin dashboard would serve stale
// funnel numbers, which is worse than a page that needs a connection.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Marketel', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Marketel';
  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    tag: data.tag || 'marketel-activity',
    // Money moments should stack rather than overwrite each other; a support
    // message replacing a payment notification loses the payment.
    renotify: !!data.tag,
    data: { url: data.url || '/funnel' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/funnel';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus the dashboard if it is already open rather than stacking windows.
      for (const client of clients) {
        if (client.url.includes('/funnel') && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
