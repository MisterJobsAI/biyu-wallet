// public/sw.js

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough fetch (sin cache por ahora)
self.addEventListener("fetch", (event) => {
  // No hacemos caching aún; solo permitimos control del SW
});