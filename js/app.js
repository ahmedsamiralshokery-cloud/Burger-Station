/* =====================================================
   app.js — المنطق الرئيسي: المنيو + السلة + واتساب
   Main logic: dynamic menu + cart + WhatsApp order
   ===================================================== */
'use strict';

/* ---------- 1) الإعدادات | Config ---------- */
const CONFIG = {
  whatsapp: '201006446834',  // رقم الواتساب بصيغة دولية بدون + | international format, no "+"
  currency: 'ج.م',
  menuKey: 'bs_menu',        // مفتاح حفظ المنيو المعدّل | edited-menu storage key
  cartKey: 'bs_cart2',       // مفتاح حفظ السلة | cart storage key
  custKey: 'bs_customer'     // بيانات العميل | customer details key
};

/* ---------- 2) أدوات مساعدة | Helpers ---------- */
const $ = id => document.getElementById(id);
const ad = v => String(v).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);   // أرقام عربية | Arabic digits
// حماية من حقن HTML في النصوص | escape text before putting it into innerHTML
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- 3) المنيو الديناميكي | Dynamic menu ---------- */
// المنيو المحفوظ من لوحة الإدارة، وإلا الافتراضي من menu-data.js
let menu = read(CONFIG.menuKey, null);
if (!menu || !Array.isArray(menu.items) || !Array.isArray(menu.categories) || !(menu.version >= DEFAULT_MENU.version)) menu = clone(DEFAULT_MENU);
if (!Array.isArray(menu.areas)) menu.areas = [];   // مناطق التوصيل | delivery areas
let activeCat = menu.categories[0].id;

function renderTabs() {
  $('tabs').innerHTML = menu.categories.map(c =>
    `<button class="${c.id === activeCat ? 'on' : ''}" data-cat="${esc(c.id)}">${esc(c.ar)}</button>`).join('');
}

function renderMenu() {
  const cat = menu.categories.find(c => c.id === activeCat) || menu.categories[0];
  // عناوين الأعمدة مرة واحدة فوق البرجر | Single/Double headers shown once
  const head = cat.sized ? '<div class="row hdr"><span></span><span class="pr"><b class="p">Single</b><b class="p">Double</b></span><span></span></div>' : '';
  const rows = menu.items.filter(i => i.cat === cat.id).map(i => {
    const img = i.img ? `<img class="thumb" src="${esc(i.img)}" alt="" loading="lazy">` : '';
    const btn = (k, p) => `<button class="p pb" data-add="${esc(k)}">${esc(p)}</button>`;
    const prices = (cat.sized && i.p2 != null) ? btn(i.id + '|s', i.p1) + btn(i.id + '|d', i.p2) : btn(i.id + '|s', i.p1);
    // عربي يمين | سعر وسط | إنجليزي شمال
    return `<div class="row"><span class="nm">${img}<span>${esc(i.ar)}${i.desc ? `<small class="ds">${esc(i.desc)}</small>` : ''}</span></span><span class="pr">${prices}</span><span class="en" dir="ltr">${esc(i.en)}</span></div>`;
  }).join('');
  $('menu').innerHTML = head + (rows || '<p class="empty">لا توجد أصناف</p>');
}

/* ---------- 4) السلة | Cart ---------- */
let cart = read(CONFIG.cartKey, []);   // [{k:'id|s', qty}]

// يحوّل مفتاح السلة إلى بيانات الصنف الحالية (الاسم/السعر) | resolves a cart key to live item data
function lookup(k) {
  const [id, sz] = k.split('|');
  const it = menu.items.find(i => i.id === id);
  if (!it) return null;                       // الصنف اتحذف | item was deleted
  const cat = menu.categories.find(c => c.id === it.cat) || {};
  const dbl = sz === 'd' && it.p2 != null;
  return { name: it.ar + (cat.sized && it.p2 != null ? (dbl ? ' (دبل)' : ' (سنجل)') : ''), price: Number(dbl ? it.p2 : it.p1), emoji: cat.emoji || '🍽️', img: it.img };
}
const total = () => cart.reduce((s, c) => { const p = lookup(c.k); return s + (p ? p.price * c.qty : 0); }, 0);

function toast(t, ms) {
  const e = $('toast'); e.textContent = t; e.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), ms || 1600);
}

/* ---------- مناطق التوصيل | Delivery areas ---------- */
const sortAreas = list => [...list].sort((x, y) => x.ar.replace(/^ال/, '').localeCompare(y.ar.replace(/^ال/, ''), 'ar'));
const OTHER = '__other';   // خيار "منطقة أخرى" | the "other city" option
function renderAreas() {
  const sel = $('custArea'), keep = sel.value || read(CONFIG.custKey, {}).area || '';
  sel.innerHTML = '<option value="">اختر منطقتك 🛵</option>' +
    sortAreas(menu.areas).map(a => `<option value="${esc(a.id)}">${esc(a.ar)} — ${ad(a.fee)} ${CONFIG.currency}</option>`).join('') +
    `<option value="${OTHER}">منطقة أخرى</option>`;
  sel.value = keep; if (sel.value !== keep) sel.value = '';
  areaUI();
}
// معلومات المنطقة المختارة | info about the selected area: none / other / area
function areaInfo() {
  const v = $('custArea').value;
  if (v === OTHER) return { mode: 'other', name: 'مدينة أخرى', fee: 0 };
  const a = menu.areas.find(x => x.id === v);
  return a ? { mode: 'area', name: a.ar, fee: Number(a.fee) } : { mode: 'none', name: '', fee: 0 };
}
// خانة العنوان تظهر بعد اختيار المنطقة (إجبارية لو "مدينة أخرى") | address box appears after choosing
function areaUI() {
  const m = areaInfo().mode, t = $('custAddr');
  t.placeholder = m === 'other' ? 'اكتب عنوانك بالتفصيل (المدينة والشارع)' : 'تفاصيل العنوان: الشارع / رقم العمارة (اختياري)';
  t.hidden = m === 'none';
}
// الإجمالي + التوصيل + الإجمالي الكلي | subtotal + delivery + grand total
function updateTotals() {
  const sub = total(), a = areaInfo();
  $('subtotal').textContent = ad(sub) + ' ' + CONFIG.currency;
  $('fee').textContent = a.mode === 'area' ? ad(a.fee) + ' ' + CONFIG.currency : a.mode === 'other' ? 'يُحدد حسب العنوان' : '—';
  $('total').textContent = ad(sub + a.fee) + ' ' + CONFIG.currency;
}

function renderCart() {
  cart = cart.filter(c => lookup(c.k));        // نشيل الأصناف المحذوفة | drop deleted items
  $('count').textContent = cart.reduce((a, c) => a + c.qty, 0);
  $('items').innerHTML = cart.length ? cart.map(c => {
    const p = lookup(c.k), k = esc(c.k);
    const pic = p.img ? `<img class="thumb" src="${esc(p.img)}" alt="">` : `<div class="em">${p.emoji}</div>`;
    return `<div class="item">${pic}<div><h4>${esc(p.name)}</h4><small>${ad(p.price)} ${CONFIG.currency}</small>
      <div class="ctl"><button data-dec="${k}" aria-label="أقل">&minus;</button><b>${ad(c.qty)}</b><button data-inc="${k}" aria-label="أكثر">+</button>
      <b class="lt">${ad(p.price * c.qty)} ${CONFIG.currency}</b><button class="rm" data-rm="${k}">حذف</button></div></div></div>`;
  }).join('') : '<p class="empty">السلة فاضية</p>';
  updateTotals();
  $('checkout').disabled = !cart.length;
  write(CONFIG.cartKey, cart);
}

function addToCart(k, btn) {
  const c = cart.find(x => x.k === k);          // نفس الصنف؟ زوّد الكمية | same item? bump qty
  c ? c.qty++ : cart.push({ k, qty: 1 });
  renderCart();
  const n = $('count'); n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
  toast('تمت الإضافة للسلة ✓'); if (btn) fly(btn);
}

function fly(b) {   // حركة نقطة طايرة للسلة | flying dot animation
  const r = b.getBoundingClientRect(), c = $('cartBtn').getBoundingClientRect(), d = document.createElement('div');
  d.className = 'fly'; d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.top + 'px'; document.body.appendChild(d);
  d.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${c.left + 18 - r.left - r.width / 2}px,${c.top + 18 - r.top}px) scale(.3)`, opacity: .4 }],
    { duration: 650, easing: 'ease-in' }).onfinish = () => d.remove();
}
function openCart(o) { $('drawer').classList.toggle('open', o); $('veil').classList.toggle('open', o); }

/* ---------- 5) إرسال الطلب على واتساب | WhatsApp order ---------- */
function buildMessage(cust, area) {
  const lines = cart.map((c, i) => { const p = lookup(c.k); return `${ad(i + 1)}. ${p.name} × ${ad(c.qty)} = ${ad(p.price * c.qty)} ${CONFIG.currency}`; });
  const sub = total(), grand = sub + area.fee;
  const feeLine = area.mode === 'area' ? `🛵 التوصيل: ${ad(area.fee)} ${CONFIG.currency}` : '🛵 التوصيل: يُحدد حسب العنوان';
  return ['🍔 *طلب جديد - Burger Station*', '',
    ...(cust.name ? [`👤 الاسم: ${cust.name}`] : []),
    `📞 الهاتف: ${ad(cust.phone)}`,
    `📍 المنطقة: ${area.name}`,
    ...(cust.addr ? [`🏠 العنوان: ${cust.addr}`] : []), '',
    '🧾 *تفاصيل الطلب:*', ...lines, '',
    `🧮 الإجمالي: ${ad(sub)} ${CONFIG.currency}`,      // الإجمالي | subtotal
    feeLine,                                            // تحته سعر التوصيل | delivery under it
    `💰 *الإجمالي الكلي: ${ad(grand)} ${CONFIG.currency}*${area.mode === 'other' ? ' (بدون التوصيل)' : ''}`].join('\n');
}

function sendOrder() {
  if (!cart.length) return;
  const cust = { name: $('custName').value.trim(), phone: $('custPhone').value.trim(), addr: $('custAddr').value.trim() }, area = areaInfo();
  if (!cust.phone) { toast('من فضلك اكتب رقم التليفون'); $('custPhone').focus(); return; }
  if (area.mode === 'none') { toast('من فضلك اختار منطقتك'); $('custArea').focus(); return; }
  if (area.mode === 'other' && !cust.addr) { toast('من فضلك اكتب عنوانك'); $('custAddr').focus(); return; }
  const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(buildMessage(cust, area))}`;
  if (!window.open(url, '_blank')) location.href = url;     // لو المتصفح منع النافذة | popup-blocked fallback
}

/* ---------- 6) الأحداث | Events ---------- */
$('tabs').onclick = e => { const b = e.target.closest('[data-cat]'); if (b) { activeCat = b.dataset.cat; renderTabs(); renderMenu(); } };
$('menu').onclick = e => { const b = e.target.closest('[data-add]'); if (b) addToCart(b.dataset.add, b); };
$('items').onclick = e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset, k = d.inc || d.dec || d.rm, c = cart.find(x => x.k === k); if (!c) return;
  if (d.inc) c.qty++;
  else if (d.dec) { c.qty--; if (c.qty < 1) cart = cart.filter(x => x !== c); }
  else cart = cart.filter(x => x !== c);
  renderCart();
};
$('cartBtn').onclick = () => openCart(true);
$('close').onclick = $('veil').onclick = () => openCart(false);
$('checkout').onclick = sendOrder;
// حفظ بيانات العميل أثناء الكتابة | remember customer details
const cust0 = read(CONFIG.custKey, {});
const saveCust = () => write(CONFIG.custKey, { name: $('custName').value, phone: $('custPhone').value, addr: $('custAddr').value, area: $('custArea').value });
[['custName', 'name'], ['custPhone', 'phone'], ['custAddr', 'addr']].forEach(([id, f]) => { $(id).value = cust0[f] || ''; $(id).oninput = saveCust; });
$('custArea').onchange = () => { saveCust(); areaUI(); updateTotals(); };

/* ---------- 7) واجهة للوحة الإدارة | API for admin.js ---------- */
window.App = {
  $, esc, getMenu: () => clone(menu),
  setMenu(m) {                                   // يحفظ المنيو ويعيد الرسم | save + re-render
    if (!write(CONFIG.menuKey, m)) return false;  // المساحة ممتلئة؟ | storage full?
    menu = clone(m);
    if (!menu.categories.some(c => c.id === activeCat)) activeCat = menu.categories[0].id;
    renderTabs(); renderMenu(); renderAreas(); renderCart(); return true;
  },
  resetMenu() { try { localStorage.removeItem(CONFIG.menuKey); } catch (e) {} menu = clone(DEFAULT_MENU); activeCat = menu.categories[0].id; renderTabs(); renderMenu(); renderAreas(); renderCart(); },
  toast
};

renderTabs(); renderMenu(); renderAreas(); renderCart();
