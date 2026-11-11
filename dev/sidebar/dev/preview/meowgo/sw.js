const CACHE_NAME = 'meowgo-beta-v4';
const ASSETS_TO_CACHE = [
  './',
  './pages/login/login.html',
  './pages/feed/feed.html',
  './pages/garden/garden.html',
  './pages/profile/profile.html',
  './pages/calendar/calendar.html',
  './pages/search/search.html',
  './pages/profile-view/profile-view.html',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Installazione: salvataggio file statici in cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Attivazione: rimozione vecchie versioni della cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch: rete per prima, cache solo come fallback offline.
// Così moduli JS e pagine aggiornate non restano bloccati nella cache vecchia.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// ==========================================
// RICEZIONE NOTIFICHE PUSH A APP CHIUSA
// ==========================================
self.addEventListener('push', (event) => {
  let data = { title: 'MeowGo 🐾', body: 'Hai una nuova notifica dallo staff!', url: './pages/feed/feed.html' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || data.notification?.title || 'MeowGo 🐾';
  const options = {
    body: data.body || data.message || data.notification?.body || 'Hai una nuova notifica!',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || data.data?.url || './pages/feed/feed.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ==========================================
// GESTIONE CLICK SULLA NOTIFICA
// ==========================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || './pages/feed/feed.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
