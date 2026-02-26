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
});
