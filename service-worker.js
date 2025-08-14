const CACHE_NAME = 'mahjong-solitaire-v3';
const TILE_IMAGES = [
  'tiles/1m.png', 'tiles/2m.png', 'tiles/3m.png', 'tiles/4m.png', 'tiles/5m.png', 'tiles/6m.png', 'tiles/7m.png', 'tiles/8m.png', 'tiles/9m.png',
  'tiles/1p.png', 'tiles/2p.png', 'tiles/3p.png', 'tiles/4p.png', 'tiles/5p.png', 'tiles/6p.png', 'tiles/7p.png', 'tiles/8p.png', 'tiles/9p.png',
  'tiles/1s.png', 'tiles/2s.png', 'tiles/3s.png', 'tiles/4s.png', '5s.png', 'tiles/6s.png', 'tiles/7s.png', 'tiles/8s.png', 'tiles/9s.png',
  'tiles/E.png', 'tiles/S.png', 'tiles/W.png', 'tiles/N.png', 'tiles/RD.png', 'tiles/GD.png', 'tiles/WD.png'
];
const urlsToCache = [
  '/',
  'index.html',
  'mah.js',
  'manifest.json',
  'icon.png',
  'service-worker.js',
  'https://cdn.tailwindcss.com',
  ...TILE_IMAGES
];


// Install event: Caches all the necessary assets for offline use.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the new service worker to activate immediately
  );
});

// Activate event: Cleans up old caches to save space.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of unmanaged clients
  );
});

// Fetch event: Serves cached content when offline.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return the cached response if it exists
        if (response) {
          return response;
        }

        // Otherwise, fetch from the network
        return fetch(event.request).then(
          fetchResponse => {
            // Check if we received a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and can only be consumed once. We consume it once to cache it
            // and once to return it to the browser.
            const responseToCache = fetchResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          }
        );
      })
  );
});
