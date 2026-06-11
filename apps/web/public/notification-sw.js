self.addEventListener('push', (event) => {
  const payload = event.data
    ? event.data.json()
    : {
        title: 'Prediction reminder',
        body: 'A prediction round is closing soon.',
        data: {
          url: '/predictions'
        }
      };

  const title = payload.title || 'Prediction reminder';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/predictor26-icon.svg',
    badge: payload.badge || '/icons/predictor26-icon.svg',
    tag: payload.tag,
    renotify: payload.renotify === true,
    data: payload.data || {
      url: '/predictions'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/predictions', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
