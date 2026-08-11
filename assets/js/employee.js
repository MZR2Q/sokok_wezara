/* ==========================================================================
   employee.js — منطق لوحة الموظف ومسار العمل (Workflow)
   ========================================================================== */
const EMP = (() => {
  const sess = guard("employee");
  const empId = sess?.employeeId;
  let filter = "all", search = "", currentDeed = null;

  const myDeeds = () => Store.deedsOfEmployee(empId);
  const WF = () => Store.workflow();

  function renderHeader() {
    const e = Store.employee(empId);
    const b = Store.branch(e.branchId);
    $("#uName").textContent = e.name;
    $("#uAvatar").textContent = initials(e.name);
    $("#uBranch").textContent = b.name;
    $("#crumb").textContent = `${b.name} / مهامي`;
  }

  function renderStats() {
    const s = Store.statsFor(myDeeds());
    $("#navProg").textContent = s.prog;
    $("#navIdle").textContent = s.idle;
    const cards = [
      ["st-total","📜",s.total,"إجمالي المسند إليّ"],
      ["st-done","✅",s.done,"منتهية"],
      ["st-prog","⏳",s.prog,"جارٍ العمل"],
      ["st-idle","💤",s.idle,"لم تبدأ"],
    ];
    $("#statCards").innerHTML = cards.map(([c,ic,v,l]) => `
      <div class="stat ${c}"><div class="st-top"><div class="st-ic">${ic}</div></div>
        <div class="st-value mono">${fmt(v)}</div><div class="st-label">${l}</div></div>`).join("");
  }

  function filtered() {
    return myDeeds().filter((d) => {
      const st = Store.statusOf(d);
      if (filter !== "all" && st !== filter) return false;
      if (search && !(d.id.includes(search) || d.mosque.includes(search))) return false;
      return true;
    });
  }

  function currentStepName(d) {
    if (d.step >= DataGen.STEP_COUNT) return "مكتمل";
    return WF()[d.step].title;
  }

  function renderDeeds() {
    const list = filtered();
    $("#deedRows").innerHTML = list.map((d) => {
      const st = Store.statusOf(d);
      return `<tr class="clickable" onclick="EMP.open('${d.id}')">
        <td class="mono t-strong">${d.id}</td>
        <td><div class="t-strong">${d.mosque}</div><div class="t-sub">${d.city}</div></td>
        <td>${d.district || "—"}</td>
        <td><span class="small">${d.step >= DataGen.STEP_COUNT ? "✅ " : `(${d.step + 1}/${DataGen.STEP_COUNT}) `}${currentStepName(d)}</span></td>
        <td>${progressHTML(Store.pctOf(d))}</td>
        <td>${badgeHTML(st)}</td>
        <td><button class="btn sm primary">فتح ↵</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="7"><div class="empty"><div class="em-ic">📭</div>لا توجد صكوك بهذا التصنيف</div></td></tr>`;
    $("#countInfo").textContent = `${fmt(list.length)} صك`;
  }

  /* ---------- نافذة مسار العمل ---------- */
  function open(deedId) {
    currentDeed = deedId;
    renderWF();
    openModal("wfModal");
  }

  function renderWF() {
    const d = Store.deed(currentDeed);
    const st = Store.statusOf(d);
    $("#wfTitle").innerHTML = `🧾 توثيق الصك <span class="mono">${d.id}</span>`;

    $("#wfInfo").innerHTML = `
      <div class="kv"><span class="k">المسجد / الجهة</span><span class="v">${d.mosque}</span></div>
      <div class="kv"><span class="k">الحي</span><span class="v">${d.district || "—"}</span></div>
      <div class="kv"><span class="k">المدينة</span><span class="v">${d.city}</span></div>
      <div class="kv"><span class="k">تاريخ الإسناد</span><span class="v">${fmtDate(d.assignedAt)}</span></div>
      <div class="kv"><span class="k">الحالة</span><span class="v">${badgeHTML(st)}</span></div>`;

    /* مسار العمل */
    const wf = WF();
    $("#wfSteps").innerHTML = wf.map((s, i) => {
      const cls = i < d.step ? "done" : i === d.step ? "current" : "";
      const hist = d.history.find((h) => h.step === i);
      const node = i < d.step ? "✓" : (i + 1);
      return `<div class="step ${cls}">
        <div class="st-line"></div>
        <div class="st-node">${node}</div>
        <div class="st-body">
          <b>${s.title}</b>
          <p>${s.desc}</p>
          ${hist ? `<div class="st-time">أُنجزت ${fmtDate(hist.at)}</div>` : ""}
        </div>
      </div>`;
    }).join("");

    renderAction(d);
  }

  function renderAction(d) {
    const box = $("#wfAction");
    if (d.step >= DataGen.STEP_COUNT) {
      box.innerHTML = `
        <div class="center">
          <div style="font-size:2.6rem">✅</div>
          <h3 class="mt-1">اكتمل توثيق الصك</h3>
          <p class="muted small mb-2">تم اعتماد الصك وإرفاق نسخته النهائية.</p>
          <div class="tag-pill" style="justify-content:center">📎 ${d.finalFile}</div>
        </div>
        <div class="divider"></div>
        <button class="btn ghost block" onclick="EMP.revert()">↩︎ التراجع عن آخر خطوة</button>`;
      return;
    }
    const step = WF()[d.step];
    const isAttach = step.key === "attach";
    box.innerHTML = `
      <div class="tag-pill mb-2">المرحلة ${d.step + 1} من ${DataGen.STEP_COUNT}</div>
      <h3>${step.title}</h3>
      <p class="muted small mb-2">${step.desc}</p>
      <div class="field">
        <label>ملاحظة / إجراء (اختياري)</label>
        <textarea class="input" id="wfNote" rows="3" placeholder="اكتب ملاحظتك على هذه المرحلة..."></textarea>
      </div>
      ${isAttach ? `
        <div class="field">
          <label>إرفاق الصك النهائي (PDF)</label>
          <input class="input" id="wfFile" type="text" value="${d.id}.pdf" />
          <div class="small muted mt-1">في النموذج الأولي يكفي إدخال اسم الملف.</div>
        </div>` : ""}
      <button class="btn primary block mt-1" onclick="EMP.advance()">
        ${isAttach ? "📎 إرفاق واعتماد نهائي" : "إنجاز الخطوة والمتابعة ←"}
      </button>
      ${d.step > 0 ? `<button class="btn ghost block mt-1" onclick="EMP.revert()">↩︎ تراجع</button>` : ""}`;
  }

  function advance() {
    const d = Store.deed(currentDeed);
    const fileName = $("#wfFile")?.value?.trim();
    Store.advanceDeed(currentDeed, fileName);
    const done = Store.deed(currentDeed).step >= DataGen.STEP_COUNT;
    toast(done ? "🎉 اكتمل توثيق الصك بنجاح" : "تم إنجاز الخطوة");
    renderWF(); renderStats(); renderDeeds();
  }
  function revert() {
    Store.revertDeed(currentDeed);
    toast("تم التراجع عن الخطوة");
    renderWF(); renderStats(); renderDeeds();
  }

  function setFilter(f, btn) {
    filter = f;
    $$(".chip").forEach((c) => c.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderDeeds();
  }

  function init() {
    renderHeader(); renderStats(); renderDeeds(); wireModalClose();
    $("#search").addEventListener("input", (e) => { search = e.target.value.trim(); renderDeeds(); });
  }
  document.addEventListener("DOMContentLoaded", init);

  return { open, advance, revert, setFilter };
})();
