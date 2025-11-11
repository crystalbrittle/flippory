const CACHE_VERSION = 'v00002';
const STATIC_CACHE = `flippory-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `flippory-runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './flippory.js',
  './external/jquery-1.8.0.min.js',
  './instructions.png',
  './resources/backgroundTexture.png',
  './resources/splashScreen.jpg',
  './resources/favicon/favicon.svg'
];

const CORE_PATHS = new Set(
  CORE_ASSETS.map((asset) => new URL(asset, self.location).pathname)
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestURL = new URL(request.url);

  if (requestURL.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (CORE_PATHS.has(requestURL.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) {
      fetch(request).then((response) => updateCache(cacheName, request, response));
      return cached;
    }

    return fetch(request).then((response) => {
      updateCache(cacheName, request, response);
      return response.clone();
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.match(request).then((cached) => {
    const networkFetch = fetch(request)
      .then((response) => {
        updateCache(cacheName, request, response);
        return response.clone();
      })
      .catch(() => cached);

    return cached || networkFetch;
  });
}

function updateCache(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return;
  }

  const cloned = response.clone();
  caches.open(cacheName).then((cache) => cache.put(request, cloned));
}
