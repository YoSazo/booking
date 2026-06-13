// Front Desk PWA — push notifications + shell caching
const CACHE = 'frontdesk-v3';
const PRECACHE = [
  '/marketellogo.svg',
  '/marketel.svg',
  '/manifest-simple-crm.json',
  '/apple-touch-icon.png',
  '/frontdesk/',
];

self.addEventListener('push', function(event) {
    let data = { title: 'New Notification', body: 'You have a new notification' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('Error parsing push data:', e);
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        requireInteraction: true,
        renotify: true,
        tag: 'booking-notification',
        vibrate: [200, 100, 200, 100, 200],
        actions: [{ action: 'view', title: '👀 View Booking' }],
        data: Object.assign({ url: data.url || '/frontdesk' }, data.data || {}),
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const urlToOpen = event.notification.data.url || '/frontdesk';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});

function staleWhileRevalidate(request) {
    return caches.open(CACHE).then(function(cache) {
        return cache.match(request).then(function(cached) {
            const network = fetch(request).then(function(response) {
                if (response && response.ok) cache.put(request, response.clone());
                return response;
            });
            return cached || network;
        });
    });
}

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(function(response) {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE).then(function(c) { c.put(event.request, clone); });
                    }
                    return response;
                })
                .catch(function() {
                    return caches.match(event.request).then(function(r) {
                        return r || caches.match('/frontdesk') || caches.match('/frontdesk/');
                    });
                })
        );
        return;
    }

    if (url.pathname.startsWith('/frontdesk/assets/') || /\.(svg|png|webp|ico|json|woff2?|css|js)$/i.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(event.request));
    }
});

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE)
            .then(function(cache) {
                return cache.addAll(PRECACHE).catch(function() { return undefined; });
            })
            .then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys()
            .then(function(keys) {
                return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) {
                    return caches.delete(k);
                }));
            })
            .then(function() { return clients.claim(); })
    );
});
