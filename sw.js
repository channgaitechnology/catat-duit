const CACHE_NAME = 'catatduit-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Listener jika client mengirim request SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request Supabase API, Netlify functions, atau method non-GET
  if (
    event.request.method !== 'GET' ||
    url.origin.includes('supabase.co') ||
    url.pathname.startsWith('/.netlify/functions')
  ) {
    return;
  }

  // Network-First untuk internal HTML, JS, CSS agar perubahan deploy selalu langsung didapat
  if (url.origin === location.origin) {
    const isCoreAsset =
      url.pathname === '/' ||
      url.pathname === '/index.html' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css');

    if (isCoreAsset) {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Jika offline atau jaringan putus, ambil dari cache
            return caches.match(event.request);
          })
      );
      return;
    }

    // Cache-First untuk gambar/ikon/font
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
