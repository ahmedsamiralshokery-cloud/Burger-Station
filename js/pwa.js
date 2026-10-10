/* =====================================================
   pwa.js — تسجيل الـ Service Worker + زر تثبيت التطبيق
   Service worker registration + install-app button
   (يعمل على https أو localhost فقط | https or localhost only)
   ===================================================== */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

(function () {
  const btn = document.getElementById('installBtn');
  if (!btn) return;
  // لو التطبيق مثبّت ومفتوح كتطبيق، نخفي الزر | hide when already running as an installed app
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) { btn.hidden = true; return; }

  let deferred = null;   // نافذة التثبيت اللي المتصفح بيجهزها | the browser's install prompt
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; window.App.toast('تم تثبيت التطبيق ✓'); });

  btn.addEventListener('click', async () => {
    if (deferred) {                      // أندرويد/كروم: التثبيت مباشرة | Android/Chrome: install right away
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      return;
    }
    // آيفون أو متصفح مش بيدعم التثبيت المباشر: نوري الخطوات | iOS / no direct prompt: show steps
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.App.toast(ios ? 'على الآيفون: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"' : 'من قائمة المتصفح ⋮ اختار "تثبيت التطبيق"', 5000);
  });
})();
