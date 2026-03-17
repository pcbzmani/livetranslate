// Service Worker for LiveTranslate PWA
// Strategy: cache-first for app shell, network-only for translation API

const CACHE     = 'livetranslate-v5';
const APP_SHELL = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json', '/icon.svg'];

// ── Install: cache app shell ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-only for API, cache-first for app shell ────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Translation API — always use network (never cache)
  if (url.includes('mymemory.translated.net')) return;

  // App shell — cache first, fall back to network
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});
