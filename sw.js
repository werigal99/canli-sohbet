// Basit Service Worker (PWA Desteği için)
const CACHE_NAME = 'metu-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Canlı socket ve video akışlarını doğrudan internete bırak
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
