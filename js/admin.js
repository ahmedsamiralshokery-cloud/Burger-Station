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
  let editingArea = null;   // المنطقة الجاري تعديلها | area being edited
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
    // قائمة مناطق التوصيل | delivery areas list
    const areaList = (m.areas || []).map(a => `<div class="arow"><span>${esc(a.ar)}<br><b>${esc(a.fee)} ج.م</b></span>
      <button class="sbtn" data-a="editarea" data-id="${esc(a.id)}">تعديل</button><button class="sbtn del" data-a="delarea" data-id="${esc(a.id)}">حذف</button></div>`).join('');
    const list = m.categories.map(c => `<div class="hd">${esc(c.ar)} · ${esc(c.en)}</div>` +
      m.items.filter(i => i.cat === c.id).map(i =>
        `<div class="arow">${i.img ? `<img class="thumb" src="${esc(i.img)}" alt="">` : ''}
         <span>${esc(i.ar)} <small>${esc(i.en)}</small><br><b>${esc(i.p1)}${i.p2 != null ? ' / ' + esc(i.p2) : ''} ج.م</b></span>
         <button class="sbtn" data-a="edit" data-id="${esc(i.id)}">تعديل</button>
         <button class="sbtn del" data-a="del" data-id="${esc(i.id)}">حذف</button></div>`).join('')).join('');
    box.innerHTML = `<div class="dh"><h2>⚙️ إدارة المنيو</h2><button class="x" data-a="close">&times;</button></div>
      <div class="atools"><button class="sbtn" data-a="add">＋ إضافة صنف</button><button class="sbtn" data-a="addarea">＋ إضافة منطقة توصيل</button><button class="sbtn pub" data-a="publish">🚀 تحديث الموقع للجميع</button><button class="sbtn" data-a="pubsettings">🔑 إعدادات النشر</button><button class="sbtn" data-a="export">⬇ تصدير menu-data.js</button><button class="sbtn del" data-a="reset">استرجاع الافتراضي</button></div>
      <p class="note">أي تعديل بيتحفظ على جهازك فورًا. دوس "🚀 تحديث الموقع للجميع" عشان يظهر للعملاء (بعد ما تضبط "🔑 إعدادات النشر" مرة واحدة).</p>
      ${form || ''}<div class="hd">🛵 مناطق التوصيل وأسعارها</div>${areaList}<div class="hd">🍽️ الأصناف</div>${list}`;
  }

  /* ----- نموذج إضافة/تعديل | Add/Edit form ----- */
  function formHtml(it) {
    const m = window.App.getMenu();
    it = it || { cat: m.categories[0].id, ar: '', en: '', p1: '', p2: null, img: '' };
    uploaded = '';
    return `<div class="aform"><label>القسم</label><select id="fcat">${m.categories.map(c => `<option value="${esc(c.id)}"${c.id === it.cat ? ' selected' : ''}>${esc(c.ar)}</option>`).join('')}</select>
      <label>الاسم بالعربي</label><input id="far" value="${esc(it.ar)}">
      <label>English name</label><input id="fen" dir="ltr" value="${esc(it.en)}">
      <label>الوصف / المكونات (اختياري)</label><textarea id="fdesc" rows="2">${esc(it.desc || '')}</textarea>
      <label>السعر (Single / السعر العادي)</label><input id="fp1" type="number" min="0" value="${esc(it.p1)}">
      <label>سعر Double (للبرجر فقط، اختياري)</label><input id="fp2" type="number" min="0" value="${it.p2 == null ? '' : esc(it.p2)}">
      <label>الصورة: مسار مثل images/burger-main.jpg، أو ارفع صورة</label><input id="fimg" dir="ltr" value="${esc(it.img || '')}" placeholder="images/..."><input id="ffile" type="file" accept="image/*">
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
    const it = { id: editingId || 'x' + Date.now().toString(36), cat: cat.id, ar, en: $('fen').value.trim(), desc: $('fdesc').value.trim(), p1,
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

  /* ----- نموذج وحفظ منطقة توصيل | Delivery-area form + save ----- */
  function areaForm(a) {
    a = a || { ar: '', fee: '' };
    return `<div class="aform"><label>اسم المنطقة</label><input id="aname" value="${esc(a.ar)}">
      <label>سعر التوصيل (ج.م)</label><input id="afee" type="number" min="0" value="${esc(a.fee)}">
      <button class="sbtn" data-a="savearea">💾 حفظ</button> <button class="sbtn" data-a="cancel">إلغاء</button></div>`;
  }
  function saveArea() {
    const m = window.App.getMenu(); m.areas = m.areas || [];
    const ar = $('aname').value.trim(), fee = parseFloat($('afee').value);
    if (!ar || isNaN(fee) || fee < 0) { alert('اكتب اسم المنطقة وسعر التوصيل'); return; }
    const a = { id: editingArea || 'a' + Date.now().toString(36), ar, fee };
    const i = m.areas.findIndex(x => x.id === editingArea);
    i >= 0 ? m.areas[i] = a : m.areas.push(a);
    if (!window.App.setMenu(m)) { alert('المساحة ممتلئة'); return; }
    editingArea = null; panel(); window.App.toast('تم الحفظ ✓');
  }

  /* ----- النشر على GitHub: تحديث المنيو للجميع بضغطة واحدة | Publish to GitHub ----- */
  // بيكتب ملف js/menu-data.js في مشروعك على GitHub عن طريق GitHub API، والموقع بيتحدث لوحده بعد دقيقة أو اتنين
  const PUB_KEY = 'bs_publish';
  const HEADER = '/* menu-data.js — بيانات المنيو الافتراضية | Default menu data (generated by the admin panel) */\n';
  const readPub = () => { try { return Object.assign({ owner: 'ahmedsamiralshokery-cloud', repo: 'Burger-Station', branch: '', path: 'js/menu-data.js', token: '' }, JSON.parse(localStorage.getItem(PUB_KEY) || '{}')); } catch (e) { return { owner: '', repo: '', branch: '', path: 'js/menu-data.js', token: '' }; } };
  let publishing = false;

  function pubForm() {
    const s = readPub();
    return `<div class="aform"><h3>🔑 إعدادات النشر على GitHub</h3>
      <p class="note">مرة واحدة بس: من GitHub ادخل Settings ← Developer settings ← Personal access tokens ← Fine-grained tokens ← Generate new token. اختار مشروع الموقع بس، وفي Permissions خلّي Contents = Read and write، وانسخ التوكن هنا. التوكن بيتحفظ على الجهاز ده بس.</p>
      <label>اسم الحساب (Owner)</label><input id="powner" dir="ltr" value="${esc(s.owner)}">
      <label>اسم المشروع (Repository)</label><input id="prepo" dir="ltr" value="${esc(s.repo)}">
      <label>الفرع Branch (سيبه فاضي لو مش عارف)</label><input id="pbranch" dir="ltr" value="${esc(s.branch)}" placeholder="main">
      <label>مسار ملف المنيو</label><input id="ppath" dir="ltr" value="${esc(s.path)}">
      <label>التوكن (Token)</label><input id="ptoken" type="password" dir="ltr" value="${esc(s.token)}" placeholder="github_pat_...">
      <button class="sbtn" data-a="savepub">💾 حفظ الإعدادات</button> <button class="sbtn" data-a="cancel">إلغاء</button></div>`;
  }
  function savePub() {
    const s = { owner: $('powner').value.trim(), repo: $('prepo').value.trim(), branch: $('pbranch').value.trim(), path: $('ppath').value.trim() || 'js/menu-data.js', token: $('ptoken').value.trim() };
    try { localStorage.setItem(PUB_KEY, JSON.stringify(s)); } catch (e) {}
    panel(); window.App.toast('تم حفظ إعدادات النشر ✓');
  }

  async function publish(btn) {
    if (publishing) return;
    const s = readPub();
    if (!s.token || !s.owner || !s.repo) { panel(pubForm()); window.App.toast('اكمل إعدادات النشر الأول'); return; }
    publishing = true; const label = btn.textContent; btn.textContent = '⏳ جاري النشر...';
    const base = `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}`;
    const H = { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };
    const file = p => base + '/contents/' + p.split('/').map(encodeURIComponent).join('/');
    const b64 = str => btoa(unescape(encodeURIComponent(str)));
    try {
      let branch = s.branch;
      if (!branch) { const r = await fetch(base, { headers: H }); if (!r.ok) throw new Error(r.status); branch = (await r.json()).default_branch; }
      const local = window.App.getMenu(), pub = JSON.parse(JSON.stringify(local));
      const ver = (local.version || 0) + 1; pub.version = ver; local.version = ver;   // رقم نسخة جديد | bump version
      // الصور المرفوعة من اللوحة بتتحفظ كملفات في images/ بدل ما تتكتب Base64 جوه المنيو
      for (const it of pub.items) if (it.img && it.img.startsWith('data:')) {
        const name = 'images/' + it.id + '-' + Date.now().toString(36) + '.jpg';
        const r = await fetch(file(name), { method: 'PUT', headers: H, body: JSON.stringify({ message: 'رفع صورة صنف', content: it.img.split(',')[1], branch }) });
        if (!r.ok) throw new Error(r.status); it.img = name;
      }
      const text = HEADER + 'const DEFAULT_MENU = ' + JSON.stringify(pub, null, 1) + ';\n';
      const g = await fetch(file(s.path) + '?ref=' + encodeURIComponent(branch), { headers: H });   // sha الملف الحالي | current file sha
      let sha; if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw new Error(g.status);
      const put = await fetch(file(s.path), { method: 'PUT', headers: H, body: JSON.stringify({ message: 'تحديث المنيو من لوحة الإدارة', content: b64(text), sha, branch }) });
      if (!put.ok) throw new Error(put.status);
      window.App.setMenu(local);   // النسخة المحلية بنفس رقم النسخة الجديد | keep local copy in sync
      window.App.toast('تم النشر ✓ هيظهر للعملاء خلال دقيقة أو اتنين', 5000);
    } catch (e) {
      const c = String(e.message);
      window.App.toast(c === '401' ? 'التوكن غلط أو منتهي' : c === '403' ? 'التوكن مالوش صلاحية Contents (Read and write)' : c === '404' ? 'اسم الحساب أو المشروع أو الملف غلط' : (c === '409' || c === '422') ? 'حصل تعارض، جرب تاني' : 'تعذر الاتصال بـ GitHub (الميزة دي بتشتغل من موقعك الأساسي بس)', 5000);
    }
    publishing = false; btn.textContent = label;
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
    else if (a === 'addarea') { editingArea = null; panel(areaForm()); }
    else if (a === 'editarea') { editingArea = id; panel(areaForm((m.areas || []).find(x => x.id === id))); }
    else if (a === 'savearea') saveArea();
    else if (a === 'delarea') { if (confirm('تحذف المنطقة دي؟')) { m.areas = (m.areas || []).filter(x => x.id !== id); window.App.setMenu(m); panel(); } }
    else if (a === 'edit') { editingId = id; panel(formHtml(m.items.find(i => i.id === id))); }
    else if (a === 'cancel') { editingId = null; panel(); }
    else if (a === 'save') save();
    else if (a === 'del') { if (confirm('تحذف الصنف ده؟')) { m.items = m.items.filter(i => i.id !== id); window.App.setMenu(m); panel(); } }
    else if (a === 'export') exportFile();
    else if (a === 'publish') publish(b);
    else if (a === 'pubsettings') panel(pubForm());
    else if (a === 'savepub') savePub();
    else if (a === 'reset') { if (confirm('ترجع المنيو الأصلي وتمسح تعديلاتك؟')) { window.App.resetMenu(); panel(); } }
  });
  box.addEventListener('change', e => { if (e.target.id === 'ffile' && e.target.files[0]) compress(e.target.files[0], d => { uploaded = d; window.App.toast('تم رفع الصورة'); }); });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'apw') box.querySelector('[data-a="login"]').click(); });
  $('adminLink').addEventListener('click', () => setTimeout(open, 0));
  addEventListener('hashchange', () => { if (location.hash === '#admin') open(); });
  if (location.hash === '#admin') open();
})();
