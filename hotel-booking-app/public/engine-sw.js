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
