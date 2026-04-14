// AutoShop Pro — Service Worker
// Caches the app shell for offline access

const CACHE = 'autoshop-v2';
const ASSETS = [
  '/autoshop-pro/',
  '/autoshop-pro/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET requests for same-origin or CDN fonts
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Network-first for Google APIs (Drive, OAuth)
  if(url.hostname.includes('googleapis.com') || url.hostname.includes('accounts.google.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Network-first for HTML (always get latest), cache-first for other assets
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/') || !url.pathname.includes('.');
  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || new Response('Offline — data is saved locally', { status: 503 })))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, fonts, images)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok && (url.pathname.startsWith('/autoshop-pro') || url.hostname.includes('fonts.g'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('Offline — data is saved locally', { status: 503 }));
    })
  );
});
