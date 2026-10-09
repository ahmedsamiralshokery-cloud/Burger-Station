/* pwa.js — تسجيل الـ Service Worker (يعمل على https أو localhost فقط)
   Registers the service worker (https or localhost only) */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
