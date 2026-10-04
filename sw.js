const CACHE_NAME = 'nook-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/store.js',
  './js/utils.js',
  './js/modules/navigation.js',
  './js/modules/onboarding.js',
  './js/modules/home.js',
  './js/modules/lists.js',
  './js/modules/agenda.js',
  './js/modules/goals.js',
  './js/modules/finances.js',
  './js/modules/settings.js',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon.svg',
  'https://unpkg.com/@phosphor-icons/web',
  'https://cdn.jsdelivr.net/npm/mobile-drag-drop@2.3.0-rc.2/default.css',
  'https://cdn.jsdelivr.net/npm/mobile-drag-drop@2.3.0-rc.2/index.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback caso esteja offline e não esteja no cache
      });
    })
  );
});