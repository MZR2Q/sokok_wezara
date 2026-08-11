/* ==========================================================================
   branch.js — منطق لوحة الفرع (استقبال الصكوك وتوزيعها على الموظفين)
   ========================================================================== */
const BR = (() => {
  const sess = guard("branch");
  const branchId = sess?.branchId;
  let filter = "all", search = "", page = 1, perPage = 12;
  const selected = new Set();
  let pendingSingle = null;

  const myDeeds = () => Store.deedsOf(branchId);

  function renderHeader() {
    const b = Store.branch(branchId);
    $("#uName").textContent = b.name;
    $("#uAvatar").textContent = b.code;
    $("#pageTitle").innerHTML = `${b.name} 🏢 <span class="tag-pill">${b.code}</span>`;
    $("#crumb").textContent = `المركز الرئيسي / ${b.name}`;
  }

  function renderStats() {
    const s = Store.branchStats(branchId);
    $("#navNew").textContent = s.new;
    const cards = [
      ["st-total","📜",s.total,"إجمالي الصكوك"],
      ["st-done","✅",s.done,"منتهية"],
      ["st-prog","⏳",s.prog,"جارٍ العمل"],
      ["st-idle","💤",s.idle + s.new,"خاملة / غير موزّعة"],
    ];
    $("#statCards").innerHTML = cards.map(([c,ic,v,l]) => `
      <div class="stat ${c}"><div class="st-top"><div class="st-ic">${ic}</div></div>
        <div class="st-value mono">${fmt(v)}</div><div class="st-label">${l}</div></div>`).join("");
  }

  function renderTeam() {
    const emps = Store.employeesOf(branchId);
    $("#teamRows").innerHTML = emps.map((e) => {
      const es = Store.statsFor(Store.deedsOfEmployee(e.id));
      return `<tr>
        <td><div class="cell-branch"><div class="branch-ic">${initials(e.name)}</div>
          <div class="t-strong">${e.name}</div></div></td>
        <td>${e.role}</td>
        <td class="mono t-strong">${fmt(es.total)}</td>
        <td class="mono" style="color:var(--st-done)">${fmt(es.done)}</td>
        <td class="mono" style="color:var(--st-prog)">${fmt(es.prog)}</td>
        <td class="mono" style="color:var(--st-idle)">${fmt(es.idle)}</td>
        <td style="min-width:150px">${progressHTML(es.activePct)}</td>
      </tr>`;
    }).join("");
  }

  function filtered() {
    return myDeeds().filter((d) => {
      const st = Store.statusOf(d);
      if (filter !== "all" && st !== filter) return false;
      if (search && !(d.id.includes(search) || d.mosque.includes(search) || (d.district||"").includes(search))) return false;
      return true;
    });
  }

  function renderDeeds() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    page = Math.min(page, pages);
    const slice = list.slice((page - 1) * perPage, page * perPage);
    const emps = Store.employeesOf(branchId);

    $("#deedRows").innerHTML = slice.map((d) => {
      const st = Store.statusOf(d);
      const emp = d.assignedEmployeeId ? Store.employee(d.assignedEmployeeId) : null;
      return `<tr>
        <td><input type="checkbox" class="rowChk" value="${d.id}" ${selected.has(d.id) ? "checked" : ""} onclick="BR.toggleRow('${d.id}',this)"></td>
        <td class="mono t-strong">${d.id}</td>
        <td><div class="t-strong">${d.mosque}</div><div class="t-sub">${d.city}</div></td>
        <td>${d.district || "—"}</td>
        <td>${emp ? `<div class="cell-branch"><div class="branch-ic" style="width:28px;height:28px;font-size:.72rem">${initials(emp.name)}</div>${emp.name}</div>`
                  : `<button class="btn sm gold" onclick="BR.openAssign('${d.id}')">إسناد لموظف</button>`}</td>
        <td>${badgeHTML(st)}</td>
        <td>${progressHTML(Store.pctOf(d))}</td>
        <td class="t-sub">${timeAgo(d.updatedAt)}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="8"><div class="empty"><div class="em-ic">📭</div>لا توجد صكوك بهذا التصنيف</div></td></tr>`;

    $("#countInfo").textContent = `عرض ${slice.length} من ${fmt(list.length)} صك`;
    renderPager(pages);
    $("#bulkEmp").innerHTML = emps.map((e) => `<option value="${e.id}">${e.name}</option>`).join("");
    updateBulkBar();
  }

  function renderPager(pages) {
    if (pages <= 1) { $("#pager").innerHTML = ""; return; }
    let html = `<button class="btn sm ghost" ${page===1?"disabled":""} onclick="BR.go(${page-1})">السابق</button>`;
    html += `<span class="btn sm" style="pointer-events:none">${page} / ${pages}</span>`;
    html += `<button class="btn sm ghost" ${page===pages?"disabled":""} onclick="BR.go(${page+1})">التالي</button>`;
    $("#pager").innerHTML = html;
  }

  /* ---------- التحديد الجماعي ---------- */
  function toggleRow(id, cb) { cb.checked ? selected.add(id) : selected.delete(id); updateBulkBar(); }
  function toggleAll(cb) {
    $$(".rowChk").forEach((c) => { c.checked = cb.checked; c.checked ? selected.add(c.value) : selected.delete(c.value); });
    updateBulkBar();
  }
  function updateBulkBar() {
    $("#selCount").textContent = selected.size;
    $("#bulkBar").style.display = selected.size ? "flex" : "none";
  }
  function doBulkAssign() {
    if (!selected.size) return;
    const empId = $("#bulkEmp").value;
    Store.bulkAssign([...selected], empId);
    toast(`تم إسناد ${selected.size} صك إلى ${Store.employee(empId).name}`);
    selected.clear();
    const chkAll = $("#chkAll"); if (chkAll) chkAll.checked = false;
    renderAll();
  }

  /* ---------- إسناد مفرد ---------- */
  function openAssign(deedId) {
    pendingSingle = deedId;
    const d = Store.deed(deedId);
    $("#amDeed").textContent = d.id;
    $("#amMosque").textContent = d.mosque;
    $("#amEmp").innerHTML = Store.employeesOf(branchId).map((e) => `<option value="${e.id}">${e.name} — ${e.role}</option>`).join("");
    openModal("assignModal");
  }
  function confirmSingle() {
    if (!pendingSingle) return;
    Store.assignDeedToEmployee(pendingSingle, $("#amEmp").value);
    closeModal("assignModal");
    toast("تم إسناد الصك للموظف");
    pendingSingle = null;
    renderAll();
  }

  /* ---------- تحكم ---------- */
  function setFilter(f, btn) { filter = f; page = 1; $$(".chip").forEach((c) => c.classList.remove("active")); btn.classList.add("active"); renderDeeds(); }
  function filterTab(f) { const btn = $(`.chip[data-f="${f}"]`); if (btn) setFilter(f, btn); scrollTo("bulkBar"); }
  function go(p) { page = p; renderDeeds(); window.scrollTo({ top: 300, behavior: "smooth" }); }
  function scrollTo(id) { $("#" + id)?.scrollIntoView({ behavior: "smooth" }); }

  function renderAll() { renderStats(); renderTeam(); renderDeeds(); }

  function init() {
    renderHeader(); renderAll(); wireModalClose();
    $("#search").addEventListener("input", (e) => { search = e.target.value.trim(); page = 1; renderDeeds(); });
    $("#amConfirm").addEventListener("click", confirmSingle);
  }
  document.addEventListener("DOMContentLoaded", init);

  return { setFilter, filterTab, go, toggleRow, toggleAll, doBulkAssign, openAssign, scrollTo };
})();
