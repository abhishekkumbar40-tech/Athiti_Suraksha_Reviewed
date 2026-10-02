const CACHE = 'athiti-season-v4';

const ASSETS = [
  './season_places.html',
  './places.json',
  './dashboard-season-widget.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE).then(cache => {
            cache.put(event.request, copy);
          });

          return response;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener('push', event => {
  let data = {
    title: 'Athiti Suraksha',
    body: 'Your seasonal destination update is ready.',
    url: 'season_places.html'
  };

  try {
    if (event.data) {
      data = {
        ...data,
        ...event.data.json()
      };
    }
  } catch (error) {
    console.log('Push data parsing error:', error);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: {
        url: data.url
      }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {

      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();

          if ('navigate' in client) {
            client.navigate(
              event.notification.data?.url || 'season_places.html'
            );
          }

          return;
        }
      }

      return clients.openWindow(
        event.notification.data?.url || 'season_places.html'
      );
    })
  );
});