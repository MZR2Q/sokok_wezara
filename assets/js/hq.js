/* ==========================================================================
   hq.js — منطق لوحة المركز الرئيسي (الوزارة)
   ========================================================================== */
const HQ = (() => {
  guard("hq");
  let branchFilter = "";

  /* ---------- بطاقات الإحصائيات العامة ---------- */
  function renderStats() {
    const g = Store.globalStats();
    const cards = [
      { cls: "st-total", ic: "📜", value: g.total, label: "إجمالي الصكوك", sub: `${Store.branches().length} فرع` },
      { cls: "st-done",  ic: "✅", value: g.done,  label: "صكوك منتهية",  sub: `${g.activePct}% نسبة الإنجاز` },
      { cls: "st-prog",  ic: "⏳", value: g.prog,  label: "جارٍ العمل",   sub: "قيد التوثيق" },
      { cls: "st-idle",  ic: "💤", value: g.idle + g.new, label: "خاملة / غير موزّعة", sub: `${g.new} بانتظار التوزيع` },
    ];
    $("#statCards").innerHTML = cards.map((c) => `
      <div class="stat ${c.cls}">
        <div class="st-top"><div class="st-ic">${c.ic}</div></div>
        <div class="st-value mono">${fmt(c.value)}</div>
        <div class="st-label">${c.label}</div>
        <div class="st-sub">${c.sub}</div>
      </div>`).join("");
  }

  /* ---------- مخطط أعمدة الفروع ---------- */
  function renderBars() {
    const rows = Store.branches().map((b) => ({ b, s: Store.branchStats(b.id) }))
      .sort((a, z) => z.s.total - a.s.total);
    const max = Math.max(1, ...rows.map((r) => r.s.total));
    $("#branchBars").innerHTML = rows.map(({ b, s }) => {
      const w = (s.total / max) * 100;
      const seg = (n) => (s.total ? (n / s.total) * 100 : 0);
      return `<div class="bar-row">
        <div class="b-name" title="${b.name}">${b.name}</div>
        <div class="bar-track" style="width:${w}%">
          <span class="seg-done" style="width:${seg(s.done)}%" title="منتهٍ: ${s.done}"></span>
          <span class="seg-prog" style="width:${seg(s.prog)}%" title="جارٍ: ${s.prog}"></span>
          <span class="seg-idle" style="width:${seg(s.idle + s.new)}%" title="خامل/غير موزّع: ${s.idle + s.new}"></span>
        </div>
        <div class="b-total mono">${fmt(s.total)}</div>
      </div>`;
    }).join("");
  }

  /* ---------- مخطط دائري (SVG) لتوزيع الحالات ---------- */
  function renderDonut() {
    const g = Store.globalStats();
    const idle = g.idle + g.new;
    const parts = [
      { v: g.done, c: "var(--st-done)", label: "منتهٍ" },
      { v: g.prog, c: "var(--st-prog)", label: "جارٍ" },
      { v: idle,   c: "var(--st-idle)", label: "خامل" },
    ];
    const total = g.total || 1;
    const R = 52, C = 2 * Math.PI * R;
    let offset = 0;
    const rings = parts.map((p) => {
      const frac = p.v / total;
      const seg = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="22"
        stroke-dasharray="${frac * C} ${C}" stroke-dashoffset="${-offset * C}"
        transform="rotate(-90 70 70)"></circle>`;
      offset += frac;
      return seg;
    }).join("");
    const legend = parts.map((p) =>
      `<div class="kv"><span class="k"><span class="sw" style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${p.c};margin-inline-end:6px"></span>${p.label}</span>
       <span class="v mono">${fmt(p.v)} (${Math.round((p.v / total) * 100)}%)</span></div>`).join("");
    $("#donutWrap").innerHTML = `
      <svg viewBox="0 0 140 140" style="width:170px;height:170px">
        <circle r="52" cx="70" cy="70" fill="none" stroke="var(--line)" stroke-width="22"></circle>
        ${rings}
        <text x="70" y="66" text-anchor="middle" font-size="22" font-weight="800" fill="var(--ink)">${fmt(g.total)}</text>
        <text x="70" y="86" text-anchor="middle" font-size="10" fill="var(--muted)">إجمالي الصكوك</text>
      </svg>
      <div style="text-align:right;margin-top:12px">${legend}</div>`;
  }

  /* ---------- جدول الفروع ---------- */
  function renderBranches() {
    const list = Store.branches().filter((b) =>
      !branchFilter || b.name.includes(branchFilter) || b.city.includes(branchFilter));
    $("#branchCount").textContent = Store.branches().length;
    $("#navBranches").textContent = Store.branches().length;

    $("#branchRows").innerHTML = list.map((b) => {
      const s = Store.branchStats(b.id);
      return `<tr class="clickable" onclick="HQ.openBranch('${b.id}')">
        <td data-label="الفرع"><div class="cell-branch"><div class="branch-ic">${b.code}</div>
          <div><div class="t-strong">${b.name}</div><div class="t-sub">${Store.employeesOf(b.id).length} موظفين</div></div></div></td>
        <td data-label="المدينة">${b.city}</td>
        <td data-label="إجمالي الصكوك" class="mono t-strong">${fmt(s.total)}</td>
        <td data-label="منتهٍ" class="mono" style="color:var(--st-done)">${fmt(s.done)}</td>
        <td data-label="جارٍ" class="mono" style="color:var(--st-prog)">${fmt(s.prog)}</td>
        <td data-label="خامل" class="mono" style="color:var(--st-idle)">${fmt(s.idle)}</td>
        <td data-label="غير موزّع" class="mono muted">${fmt(s.new)}</td>
        <td data-label="نسبة الإنجاز">${progressHTML(s.activePct)}</td>
        <td data-label=""><button class="btn sm ghost">عرض ↵</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="9"><div class="empty"><div class="em-ic">🔍</div>لا توجد نتائج مطابقة</div></td></tr>`;
  }

  /* ---------- نافذة تفاصيل الفرع ---------- */
  function openBranch(branchId) {
    const b = Store.branch(branchId);
    const s = Store.branchStats(branchId);
    const emps = Store.employeesOf(branchId);
    $("#bmTitle").innerHTML = `🏢 ${b.name} <span class="tag-pill">${b.code}</span>`;

    const empRows = emps.map((e) => {
      const list = Store.deedsOfEmployee(e.id);
      const es = Store.statsFor(list);
      return `<tr>
        <td data-label="الموظف"><div class="cell-branch"><div class="branch-ic">${initials(e.name)}</div>
          <div><div class="t-strong">${e.name}</div><div class="t-sub">${e.role}</div></div></div></td>
        <td data-label="إجمالي" class="mono t-strong">${fmt(es.total)}</td>
        <td data-label="منتهٍ" class="mono" style="color:var(--st-done)">${fmt(es.done)}</td>
        <td data-label="جارٍ" class="mono" style="color:var(--st-prog)">${fmt(es.prog)}</td>
        <td data-label="خامل" class="mono" style="color:var(--st-idle)">${fmt(es.idle)}</td>
        <td data-label="نسبة الإنجاز" style="min-width:150px">${progressHTML(es.activePct)}</td>
      </tr>`;
    }).join("");

    const unassigned = Store.deedsOf(branchId).filter((d) => !d.assignedEmployeeId).length;

    $("#bmBody").innerHTML = `
      <div class="grid stat-grid mb-3">
        ${miniStat("st-total","📜",s.total,"إجمالي")}
        ${miniStat("st-done","✅",s.done,"منتهٍ")}
        ${miniStat("st-prog","⏳",s.prog,"جارٍ")}
        ${miniStat("st-idle","💤",s.idle,"خامل")}
      </div>
      ${unassigned ? `<div class="side-branch-note mb-3">📌 يوجد <b>${fmt(unassigned)}</b> صك غير موزّع على الموظفين في هذا الفرع.</div>` : ""}
      <h3 class="mb-2">👥 الصكوك موزّعة على الموظفين</h3>
      <div class="table-wrap card">
        <table class="data">
          <thead><tr><th>الموظف</th><th>إجمالي</th><th>منتهٍ</th><th>جارٍ</th><th>خامل</th><th>نسبة الإنجاز</th></tr></thead>
          <tbody>${empRows || `<tr><td colspan="6" class="center muted">لا يوجد موظفون</td></tr>`}</tbody>
        </table>
      </div>`;
    openModal("branchModal");
  }
  const miniStat = (cls, ic, v, l) => `
    <div class="stat ${cls}"><div class="st-top"><div class="st-ic">${ic}</div></div>
      <div class="st-value mono">${fmt(v)}</div><div class="st-label">${l}</div></div>`;

  /* ---------- إسناد صكوك جديدة ---------- */
  function openAssign() {
    $("#asBranch").innerHTML = Store.branches().map((b) => `<option value="${b.id}">${b.name}</option>`).join("");
    openModal("assignModal");
  }
  function confirmAssign() {
    const branchId = $("#asBranch").value;
    const count = Math.max(1, Math.min(5000, parseInt($("#asCount").value) || 0));
    const mosque = $("#asMosque").value.trim();
    Store.assignDeedsToBranch(branchId, count, mosque);
    closeModal("assignModal");
    toast(`تم إسناد ${fmt(count)} صك إلى ${Store.branch(branchId).name}`);
    renderAll();
  }

  function scrollTo(id) { $("#" + id)?.scrollIntoView({ behavior: "smooth" }); }

  function renderAll() { renderStats(); renderBars(); renderDonut(); renderBranches(); }

  /* ---------- التهيئة ---------- */
  function init() {
    renderAll();
    wireModalClose();
    $("#branchSearch").addEventListener("input", (e) => { branchFilter = e.target.value.trim(); renderBranches(); });
    $("#asConfirm").addEventListener("click", confirmAssign);
  }
  document.addEventListener("DOMContentLoaded", init);

  return { openBranch, openAssign, scrollTo };
})();
