// Minimal service worker for the booking engine.
// Its only job is to make the site installable as a PWA (home-screen app).
// We intentionally do NOT cache booking/availability API responses so guests
// always see live data — this is network-first / pass-through.

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler. Having a fetch handler is required for some
// browsers to consider the app installable. We never serve stale data.
self.addEventListener('fetch', function () {
  // No-op: let the network handle everything.
});

// Push handling lives here too as a safety net: the Front Desk (sw.js) and the
// booking engine (this file) share the same origin/scope, so whichever service
// worker ends up controlling the scope must be able to display booking alerts.
self.addEventListener('push', function (event) {
  let data = { title: 'New Booking!', body: 'A new booking just came in.' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) {}
  }
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    requireInteraction: data.requireInteraction !== false,
    renotify: data.renotify !== false,
    tag: data.tag || (data.data && data.data.tag) || 'marketel-notification',
    vibrate: [200, 100, 200, 100, 200],
    data: Object.assign({ url: data.url || '/frontdesk' }, data.data || {}),
  };
  const notificationPromise = self.registration.showNotification(data.title, options);
  const refreshOpenApps = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (clientList) {
      clientList.forEach(function (client) {
        client.postMessage({
          type: 'marketel-guest-data-updated',
          source: 'push',
          url: (data.data && data.data.url) || data.url || '',
          reservationCode: data.data && data.data.reservationCode,
          status: data.data && data.data.status,
        });
      });
    })
    .catch(function () {});
  const badgePromise = self.navigator && typeof self.navigator.setAppBadge === 'function'
    ? self.navigator.setAppBadge(1).catch(function () {})
    : Promise.resolve();
  event.waitUntil(Promise.all([notificationPromise, badgePromise, refreshOpenApps]));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/guest/messages';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          const base = self.location.origin;
          const path = urlToOpen.startsWith('/') ? urlToOpen : '/' + urlToOpen;
          if ('navigate' in client) {
            return client.navigate(base + path).then(function () { return client.focus(); });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        const base = self.location.origin;
        const path = urlToOpen.startsWith('/') ? urlToOpen : '/' + urlToOpen;
        return clients.openWindow(base + path);
      }
    })
  );
});
