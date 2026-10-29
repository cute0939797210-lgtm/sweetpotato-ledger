// 🍠 Service Worker：App 本身可離線開啟；資料一律即時連線（不快取帳務資料，避免看到舊數字）
const CACHE = "sp-366b4dfb0a";
const SHELL = ["./", "./index.html", "./app.js?v=366b4dfb0a", "./app.css?v=366b4dfb0a", "./config.js?v=366b4dfb0a", "./manifest.webmanifest", "./icons/icon-192.png"];

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
    e.respondWith(fetch(e.request.url, { cache: "no-store" }).catch(() => caches.match("./index.html")));   // 首頁一律抓最新，不用手機舊快取
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
