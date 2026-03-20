const CACHE_NAME = 'futbolapp-v1';
const ASSETS = [
  '/',
  '/auth/login',
  '/css/styles.css',
  '/js/app.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  // Strategy: Network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cache successful non-API requests for offline use
        if (response.ok && !e.request.url.includes('/api/')) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
