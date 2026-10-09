/* =====================================================
   admin.js — لوحة إدارة المنيو | Menu admin panel
   تفتح من الرابط #admin أو من رمز ⚙ في آخر الصفحة
   Opens via #admin or the ⚙ icon in the footer
   ===================================================== */
(function () {
  'use strict';
  // ⚠️ غيّر كلمة السر دي! الحماية هنا على مستوى المتصفح فقط (مش أمان حقيقي)
  // ⚠️ Change this! Client-side only — not real security.
  const ADMIN_PASSWORD = 'burger2026';
  const { $, esc } = window.App;
  let editingId = null;   // الصنف الجاري تعديله (null = جديد) | item being edited
  let uploaded = '';      // صورة مرفوعة (Data URL مضغوطة) | compressed uploaded image

  /* ----- بناء النافذة | Build modal ----- */
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = '<div class="mbox" id="adminBox"></div>';
  document.body.appendChild(modal);
  const box = $('adminBox');
  const authed = () => { try { return sessionStorage.getItem('bs_admin') === '1'; } catch (e) { return false; } };

  function open() { modal.classList.add('open'); authed() ? panel() : login(); }
  function close() { modal.classList.remove('open'); if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search); }

  /* ----- شاشة الدخول | Login ----- */
  function login() {
    box.innerHTML = `<h2>🔒 لوحة الإدارة</h2><input type="password" id="apw" placeholder="كلمة السر" autofocus>
      <button class="sbtn" data-a="login">دخول</button> <button class="sbtn" data-a="close">إغلاق</button><p class="note" id="aerr"></p>`;
  }

  /* ----- لوحة التحكم | Panel (form اختياري) ----- */
  function panel(form) {
    const m = window.App.getMenu();
    const list = m.categories.map(c => `<div class="hd">${esc(c.ar)} · ${esc(c.en)}</div>` +
      m.items.filter(i => i.cat === c.id).map(i =>
        `<div class="arow">${i.img ? `<img class="thumb" src="${esc(i.img)}" alt="">` : ''}
         <span>${esc(i.ar)} <small>${esc(i.en)}</small><br><b>${esc(i.p1)}${i.p2 != null ? ' / ' + esc(i.p2) : ''} ج.م</b></span>
         <button class="sbtn" data-a="edit" data-id="${esc(i.id)}">تعديل</button>
         <button class="sbtn del" data-a="del" data-id="${esc(i.id)}">حذف</button></div>`).join('')).join('');
    box.innerHTML = `<div class="dh"><h2>⚙️ إدارة المنيو</h2><button class="x" data-a="close">&times;</button></div>
      <div class="atools"><button class="sbtn" data-a="add">＋ إضافة صنف</button><button class="sbtn" data-a="export">⬇ تصدير menu-data.js</button><button class="sbtn del" data-a="reset">استرجاع الافتراضي</button></div>
      <p class="note">التعديلات بتتحفظ على الجهاز/المتصفح ده بس. عشان تظهر لكل العملاء: اضغط "تصدير" واستبدل ملف js/menu-data.js.</p>
      ${form || ''}${list}`;
  }

  /* ----- نموذج إضافة/تعديل | Add/Edit form ----- */
  function formHtml(it) {
    const m = window.App.getMenu();
    it = it || { cat: m.categories[0].id, ar: '', en: '', p1: '', p2: null, img: '' };
    uploaded = '';
    return `<div class="aform"><label>القسم</label><select id="fcat">${m.categories.map(c => `<option value="${esc(c.id)}"${c.id === it.cat ? ' selected' : ''}>${esc(c.ar)}</option>`).join('')}</select>
      <label>الاسم بالعربي</label><input id="far" value="${esc(it.ar)}">
      <label>English name</label><input id="fen" dir="ltr" value="${esc(it.en)}">
      <label>السعر (Single / السعر العادي)</label><input id="fp1" type="number" min="0" value="${esc(it.p1)}">
      <label>سعر Double (للبرجر فقط، اختياري)</label><input id="fp2" type="number" min="0" value="${it.p2 == null ? '' : esc(it.p2)}">
      <label>الصورة: مسار مثل images/burger-1.jpg، أو ارفع صورة</label><input id="fimg" dir="ltr" value="${esc(it.img || '')}" placeholder="images/..."><input id="ffile" type="file" accept="image/*">
      <button class="sbtn" data-a="save">💾 حفظ</button> <button class="sbtn" data-a="cancel">إلغاء</button></div>`;
  }

  /* ----- ضغط الصورة المرفوعة (توفير مساحة localStorage) | compress upload ----- */
  function compress(file, cb) {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const s = Math.min(1, 600 / im.width), c = document.createElement('canvas');
      c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .7)); }; im.src = r.result; };
    r.readAsDataURL(file);
  }

  /* ----- حفظ صنف | Save item ----- */
  function save() {
    const m = window.App.getMenu(), cat = m.categories.find(c => c.id === $('fcat').value);
    const ar = $('far').value.trim(), p1 = parseFloat($('fp1').value), p2v = $('fp2').value.trim();
    if (!ar || isNaN(p1)) { alert('اكتب الاسم والسعر'); return; }
    const it = { id: editingId || 'x' + Date.now().toString(36), cat: cat.id, ar, en: $('fen').value.trim(), p1,
      p2: (cat.sized && p2v !== '') ? parseFloat(p2v) : null, img: uploaded || $('fimg').value.trim() };
    const idx = m.items.findIndex(i => i.id === editingId);
    idx >= 0 ? m.items[idx] = it : m.items.push(it);
    if (!window.App.setMenu(m)) { alert('المساحة ممتلئة: استخدم صور أصغر أو مسار images/'); return; }
    editingId = null; panel(); window.App.toast('تم الحفظ ✓');
  }

  /* ----- تصدير المنيو كملف menu-data.js | Export ----- */
  function exportFile() {
    const m = window.App.getMenu();
    const txt = 'const DEFAULT_MENU = ' + JSON.stringify(m, null, 1) + ';\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })); a.download = 'menu-data.js'; a.click();
  }

  /* ----- الأحداث | Events ----- */
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, id = b.dataset.id, m = window.App.getMenu();
    if (a === 'close') close();
    else if (a === 'login') {
      if ($('apw').value === ADMIN_PASSWORD) { try { sessionStorage.setItem('bs_admin', '1'); } catch (x) {} panel(); }
      else $('aerr').textContent = 'كلمة السر غلط';
    }
    else if (a === 'add') { editingId = null; panel(formHtml()); }
    else if (a === 'edit') { editingId = id; panel(formHtml(m.items.find(i => i.id === id))); }
    else if (a === 'cancel') { editingId = null; panel(); }
    else if (a === 'save') save();
    else if (a === 'del') { if (confirm('تحذف الصنف ده؟')) { m.items = m.items.filter(i => i.id !== id); window.App.setMenu(m); panel(); } }
    else if (a === 'export') exportFile();
    else if (a === 'reset') { if (confirm('ترجع المنيو الأصلي وتمسح تعديلاتك؟')) { window.App.resetMenu(); panel(); } }
  });
  box.addEventListener('change', e => { if (e.target.id === 'ffile' && e.target.files[0]) compress(e.target.files[0], d => { uploaded = d; window.App.toast('تم رفع الصورة'); }); });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'apw') box.querySelector('[data-a="login"]').click(); });
  $('adminLink').addEventListener('click', () => setTimeout(open, 0));
  addEventListener('hashchange', () => { if (location.hash === '#admin') open(); });
  if (location.hash === '#admin') open();
})();
