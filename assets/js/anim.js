/* ==========================================================================
   anim.js — حركات واجهة خفيفة: عدّاد تصاعدي، موجة نقر، ظهور متدرّج
   ========================================================================== */

/* عدّاد تصاعدي للأرقام (يقرأ data-count) */
function countUp(elm, dur = 900) {
  const target = parseFloat(elm.getAttribute("data-count")) || 0;
  if (elm.dataset.counted === "1") { elm.textContent = fmt(target); return; }
  elm.dataset.counted = "1";
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    elm.textContent = fmt(Math.round(target * ease(p)));
    if (p < 1) requestAnimationFrame(tick);
    else elm.textContent = fmt(target);
  }
  requestAnimationFrame(tick);
}
function animateCounters(root = document) {
  root.querySelectorAll("[data-count]").forEach((e) => countUp(e));
}

/* ضبط تأخير الظهور المتدرّج لعناصر مجموعة */
function stagger(nodes, cls = "reveal") {
  Array.from(nodes).forEach((n, i) => { n.style.setProperty("--i", i); n.classList.add(cls); });
}

/* موجة النقر على الأزرار */
function wireRipple() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.width = s.style.height = d + "px";
    s.style.left = (e.clientX - r.left - d / 2) + "px";
    s.style.top = (e.clientY - r.top - d / 2) + "px";
    btn.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });
}
document.addEventListener("DOMContentLoaded", wireRipple);
