/* sw.js — Service Worker: يخلي الموقع يفتح حتى بدون نت | makes the site work offline
   الاستراتيجية: الشبكة أولاً ثم الكاش، فالتحديثات (مثل menu-data.js) تظهر فورًا وهو أونلاين
   Strategy: network first, fall back to cache */
const CACHE = 'burger-station-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/menu-data.js', 'js/app.js', 'js/admin.js', 'js/pwa.js',
  'images/logo.jpg', 'images/burger-1.jpg', 'images/burger-2.jpg', 'icons/icon-192.png', 'icons/icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;  // ملفاتنا فقط | own files only
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
