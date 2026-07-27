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

    // Server-supplied actions/tag win; everything else keeps the historical
    // defaults so the older notification types render exactly as before.
    const actions = Array.isArray(data.actions)
        ? data.actions
        : [{ action: 'view', title: '👀 View Booking' }];

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        requireInteraction: data.requireInteraction !== false, // Stays until clicked! 🔥
        renotify: data.renotify !== false,
        // Per-booking tags let an approval prompt replace itself once decided.
        tag: data.tag || 'booking-notification',
        vibrate: data.vibrate || [200, 100, 200, 100, 200], // Stronger vibration pattern
        actions: actions,
        data: Object.assign({ url: data.url || '/frontdesk' }, data.data || {})
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Apply an approval decision straight from the notification, then report back in
// place of the prompt so the owner sees the outcome without opening the app.
function applyApprovalFromNotification(action, payload) {
    var token = (payload && payload.token) || '';
    if (!token) {
        return self.registration.showNotification('Approval link missing', {
            body: 'Open Front Desk to confirm or release this booking.',
            icon: '/apple-touch-icon.png',
            data: { url: '/frontdesk?tab=bookings' }
        });
    }

    return fetch('/api/booking-approval/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, action: action })
    }).then(function(res) {
        return res.json().catch(function() { return {}; });
    }).then(function(body) {
        if (!body || body.success !== true) {
            throw new Error((body && body.message) || 'failed');
        }
        var released = action === 'release';
        var title = body.alreadyDecided
            ? 'Already decided'
            : (released ? 'Booking released 🚫' : 'Booking confirmed ✓');
        var detail = [body.roomName, body.guestName].filter(Boolean).join(' · ');
        var body2 = body.alreadyDecided
            ? 'This booking was already ' + (body.status || 'decided') + '.'
            : (released
                ? (detail ? detail + ' — room is back on sale.' : 'Room is back on sale.')
                : (detail ? detail + ' — guest has been emailed.' : 'Guest has been emailed.'));

        return self.registration.showNotification(title, {
            body: body2,
            icon: '/apple-touch-icon.png',
            requireInteraction: false,
            data: { url: '/frontdesk?tab=bookings' }
        });
    }).catch(function() {
        // Never leave the owner guessing — surface a retry path into the app.
        return self.registration.showNotification("Couldn't apply that", {
            body: 'Tap to open Front Desk and decide there.',
            icon: '/apple-touch-icon.png',
            requireInteraction: true,
            data: { url: '/frontdesk?approve=' + encodeURIComponent(token) }
        });
    });
}

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received. Action:', event.action);
    
    event.notification.close();
    
    // Handle action buttons
    if (event.action === 'dismiss') {
        // Just close the notification, do nothing else
        console.log('[Service Worker] Notification dismissed by user');
        return;
    }

    // Approval buttons act in place. Tapping the notification body instead falls
    // through to the deep link below, which is the path that always works —
    // iOS does not reliably render action buttons for web push.
    if (event.action === 'confirm' || event.action === 'release') {
        event.waitUntil(applyApprovalFromNotification(event.action, event.notification.data || {}));
        return;
    }
    
    // For 'view' action or clicking the notification body
    const urlToOpen = event.notification.data.url || '/frontdesk';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Deep links carry a one-off query string that no open tab will ever
            // match, so steer an existing Front Desk window to it rather than
            // stacking up duplicate windows.
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.indexOf('/frontdesk') !== -1 && 'navigate' in client) {
                    return client.navigate(urlToOpen).then(function(navigated) {
                        return navigated && 'focus' in navigated ? navigated.focus() : null;
                    }).catch(function() {
                        return 'focus' in client ? client.focus() : null;
                    });
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
