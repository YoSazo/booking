<<<<<<< HEAD
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
        data: data.data || {},
        vibrate: [200, 100, 200],
        tag: 'booking-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    
    event.notification.close();
    
    const urlToOpen = event.notification.data.url || '/funnel';
    
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

// Install event
self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating...');
    event.waitUntil(clients.claim());
=======
self.addEventListener('push', function (event) {
  var data = { title: 'New booking', body: 'A new booking just came in.', url: '/crm' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'New booking', {
      body: data.body || 'A new booking just came in.',
      icon: '/marketellogo.svg',
      badge: '/marketellogo.svg',
      data: { url: data.url || '/crm' },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetPath = (event.notification.data && event.notification.data.url) || '/crm';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf(targetPath) !== -1 && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
>>>>>>> c4526c9e603cbc5668943dba17729e0e73641695
});
