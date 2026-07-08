const CACHE_NAME = 'ai-chat-shell-v1';

// App shell files to cache for offline loading
const SHELL_FILES = [
  '/',
  '/index.html',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything, fall back to cache for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls and Supabase requests
  if (request.url.includes('/rest/') || 
      request.url.includes('/auth/') || 
      request.url.includes('/storage/') ||
      request.url.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for app shell files
        if (response.ok && (request.url.endsWith('.js') || request.url.endsWith('.css') || request.url.endsWith('.html') || request.url === new URL('/', self.location).href)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache, for navigation requests serve index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return caches.match(request);
      })
  );
});