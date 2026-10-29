// 🍠 Service Worker：App 本身可離線開啟；資料一律即時連線（不快取帳務資料，避免看到舊數字）
const CACHE = "sp-3cd65e842c";
const SHELL = ["./", "./index.html", "./app.js?v=3cd65e842c", "./app.css?v=3cd65e842c", "./config.js?v=3cd65e842c", "./manifest.webmanifest", "./icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;   // Supabase 請求不經過快取
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
