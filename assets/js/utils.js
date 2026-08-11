/* ==========================================================================
   utils.js — دوال مساعدة عامة (DOM، التنسيق، الحالات، الإشعارات)
   ========================================================================== */

/* اختصارات DOM */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.append(c.nodeType ? c : document.createTextNode(c));
  });
  return node;
}

/* الأرقام بصيغة عربية مفصولة بفواصل */
const nf = new Intl.NumberFormat("ar-SA");
const fmt = (n) => nf.format(n || 0);

/* التواريخ */
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "numeric" })
      .format(new Date(iso));
  } catch { return iso; }
}
function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function timeAgo(iso) {
  const d = daysSince(iso);
  if (d <= 0) return "اليوم";
  if (d === 1) return "أمس";
  if (d < 30) return `قبل ${d} يوم`;
  const m = Math.floor(d / 30);
  return m === 1 ? "قبل شهر" : `قبل ${m} أشهر`;
}

/* ---------- تعريف الحالات ---------- */
const STATUS = {
  done:  { key: "done",  label: "منتهي",         badge: "b-done", color: "var(--st-done)" },
  prog:  { key: "prog",  label: "جارٍ العمل",     badge: "b-prog", color: "var(--st-prog)" },
  idle:  { key: "idle",  label: "خامل",           badge: "b-idle", color: "var(--st-idle)" },
  new:   { key: "new",   label: "غير مُوزّع",      badge: "b-new",  color: "var(--st-new)" },
};

function badgeHTML(statusKey) {
  const s = STATUS[statusKey] || STATUS.new;
  return `<span class="badge ${s.badge}"><span class="dot"></span>${s.label}</span>`;
}

/* شريط تقدم */
function progressHTML(pct, gold = false) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="progress-meta">
      <div class="progress ${gold ? "gold" : ""}"><span style="width:${pct}%"></span></div>
      <span class="p-pct mono">${pct}%</span>
    </div>`;
}

/* الأحرف الأولى للاسم (للأفاتار) */
function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

/* إشعار سريع */
let _toastTimer;
function toast(msg, ok = true) {
  let t = $("#toast");
  if (!t) { t = el("div", { id: "toast", class: "toast" }); document.body.append(t); }
  t.className = "toast" + (ok ? " ok" : "");
  t.innerHTML = `<span>${ok ? "✓" : "⚠"}</span><span>${msg}</span>`;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* نافذة منبثقة */
function openModal(id) { $("#" + id)?.classList.add("open"); }
function closeModal(id) { $("#" + id)?.classList.remove("open"); }
function wireModalClose() {
  $$(".modal-backdrop").forEach((bd) => {
    bd.addEventListener("click", (e) => { if (e.target === bd) bd.classList.remove("open"); });
  });
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest(".modal-backdrop")?.classList.remove("open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal-backdrop.open").forEach((m) => m.classList.remove("open"));
  });
}

/* قراءة معطى من الرابط */
function qs(name) { return new URLSearchParams(location.search).get(name); }

/* التنقل على الجوال: فتح/إغلاق الدرج الجانبي */
function wireMobileNav() {
  const toggle = $("#navToggle");
  const sidebar = $("#sidebar");
  const overlay = $("#navOverlay");
  if (!toggle || !sidebar) return;
  const set = (open) => {
    sidebar.classList.toggle("open", open);
    overlay?.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => set(!sidebar.classList.contains("open")));
  overlay?.addEventListener("click", () => set(false));
  /* إغلاق الدرج عند اختيار أي رابط منه */
  $$("#sidebar .side-link").forEach((l) => l.addEventListener("click", () => set(false)));
}
document.addEventListener("DOMContentLoaded", wireMobileNav);

/* حماية بسيطة من الوصول بدون جلسة */
function guard(role) {
  const s = Store.session();
  if (!s || (role && s.role !== role)) { location.href = "index.html"; return null; }
  return s;
}
