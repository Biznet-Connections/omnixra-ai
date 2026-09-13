console.log("🔥 Service Worker loaded");

const CACHE_NAME = 'omnixra-cache-v4';
const STATIC_ASSETS = ['/manifest.json', '/favicon.svg', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// ═════════════════════════════════════════════════════════════
// FETCH HANDLER — safe, non-intrusive
// ═════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── NEVER touch API, OAuth, share, or cross-origin ──
  // Let the browser handle these natively (no respondWith).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/share/')) return;
  if (request.method !== 'GET') return;

  // ── NEVER intercept auth-callback navigations ──
  // (they need the live HTML + live JS to process #token)
  if (url.pathname.startsWith('/auth-callback')) return;

  // ── HTML navigation: network-first, cache-fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then(r => r || Response.error()))
    );
    return;
  }

  // ── Static assets: cache-first, network-fallback ──
  // Only for known extensions.
  const isStatic = /\.(js|css|svg|png|jpg|jpeg|webp|woff2?|ttf|ico)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          // Only cache valid, same-origin, 200 responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});

// ═════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'New notification from Omnixra AI' };
  }
  const options = {
    body: data.body || 'New notification from Omnixra AI',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Omnixra AI', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) if (client.url.includes(url)) return client.focus();
      return clients.openWindow(url);
    })
  );
});
