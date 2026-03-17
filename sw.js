const CACHE     = 'livetranslate-v6';
const APP_SHELL = [
  '/livetranslate/',
  '/livetranslate/index.html',
  '/livetranslate/style.css',
  '/livetranslate/app.js',
  '/livetranslate/manifest.json',
  '/livetranslate/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('mymemory.translated.net')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
