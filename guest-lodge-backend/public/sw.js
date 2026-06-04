// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    
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
        icon: data.icon || '/marketellogo.svg',
        badge: data.badge || '/marketellogo.svg',
        requireInteraction: true, // Stays until clicked! 🔥
        renotify: true,
        tag: 'booking-notification',
        vibrate: [200, 100, 200, 100, 200], // Stronger vibration pattern
        actions: [
            {
                action: 'view',
                title: '👀 View Booking'
            }
        ],
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received. Action:', event.action);
    
    event.notification.close();
    
    // Handle action buttons
    if (event.action === 'dismiss') {
        // Just close the notification, do nothing else
        console.log('[Service Worker] Notification dismissed by user');
        return;
    }
    
    // For 'view' action or clicking the notification body
    const urlToOpen = event.notification.data.url || '/simple-crm';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Fetch handler — required for the app to be installable as a PWA.
// Network-first with no aggressive caching so the live dashboard always shows
// fresh data; only navigations get a cache fallback when offline.
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request).then(function(r) {
                    return r || Response.error();
                });
            })
        );
    }
    // Non-navigation requests fall through to default network handling.
});

// Install event
self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating...');
    event.waitUntil(clients.claim());
});
