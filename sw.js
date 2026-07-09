const CACHE_NAME = 'ai-chat-shell-v2';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // FIX: Skip caching for non-http/s protocols (resolves chrome-extension scheme issues)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  // Avoid intercepting auth, database, or media storage API routes
  if (request.url.includes('/rest/') || 
      request.url.includes('/auth/') || 
      request.url.includes('/storage/') ||
      request.url.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.url.endsWith('.js') || request.url.endsWith('.css') || request.url.endsWith('.html') || request.url === new URL('./', self.location).href)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return caches.match(request);
      })
  );
});