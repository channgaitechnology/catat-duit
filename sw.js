const CACHE_NAME = 'catatduit-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/00-globals.js',
  '/js/01-auth.js',
  '/js/02-realtime.js',
  '/js/03-data.js',
  '/js/04-categories.js',
  '/js/05-render.js',
  '/js/06-transactions.js',
  '/js/07-assets-debts.js',
  '/js/08-reports.js',
  '/js/09-app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('Gagal caching aset saat install:', asset, err);
        }
      }
    })
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

  // Jangan cache request Supabase API (kecuali CDN library), Netlify functions, atau method non-GET
  if (
    event.request.method !== 'GET' ||
    (url.origin.includes('supabase.co') && !url.pathname.endsWith('.js')) ||
    url.pathname.startsWith('/.netlify/functions')
  ) {
    return;
  }

  // Dukungan Cache untuk CDN pihak ketiga (Supabase JS SDK dan Google Fonts)
  if (
    url.origin.includes('cdn.jsdelivr.net') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // Penanganan Same-Origin
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
            // Jika offline atau jaringan terputus, ambil dari cache
            return caches.match(event.request).then((res) => {
              if (res) return res;
              if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
              }
            });
          })
      );
      return;
    }

    // Cache-First untuk gambar/ikon
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
