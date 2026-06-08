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
    requireInteraction: true,
    renotify: true,
    tag: 'booking-notification',
    vibrate: [200, 100, 200, 100, 200],
    data: Object.assign({ url: data.url || '/frontdesk' }, data.data || {}),
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/frontdesk';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url.includes(urlToOpen) && 'focus' in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
