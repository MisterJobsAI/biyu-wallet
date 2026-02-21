// public/biyu-sw.js
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// SW mínimo (sin cache por ahora)
self.addEventListener("fetch", () => {});