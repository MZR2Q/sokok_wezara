/* ==========================================================================
   store.js — طبقة الحالة: التحميل، الحفظ في المتصفح، والاستعلامات
   ========================================================================== */

const Store = (() => {
  const KEY = "sukuk_db_v1";
  const SESSION_KEY = "sukuk_session";
  let db = null;

  function load() {
    if (db) return db;
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { db = JSON.parse(raw); } catch { db = null; }
    }
    if (!db) { db = DataGen.generate(); save(); }
    return db;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function reset() { localStorage.removeItem(KEY); db = null; return load(); }

  /* ---------- اشتقاق حالة الصك ---------- */
  function statusOf(deed) {
    if (deed.step >= DataGen.STEP_COUNT) return "done";
    if (!deed.assignedEmployeeId) return "new";
    if (deed.step === 0) return "idle";
    return "prog";
  }
  function pctOf(deed) { return Math.round((deed.step / DataGen.STEP_COUNT) * 100); }

  /* ---------- استعلامات ---------- */
  const branches = () => load().branches;
  const employees = () => load().employees;
  const deeds = () => load().deeds;
  const workflow = () => load().workflow;

  const branch = (id) => branches().find((b) => b.id === id);
  const employee = (id) => employees().find((e) => e.id === id);
  const deed = (id) => deeds().find((d) => d.id === id);

  const employeesOf = (branchId) => employees().filter((e) => e.branchId === branchId);
  const deedsOf = (branchId) => deeds().filter((d) => d.branchId === branchId);
  const deedsOfEmployee = (empId) => deeds().filter((d) => d.assignedEmployeeId === empId);

  /* إحصائيات لمجموعة صكوك */
  function statsFor(list) {
    const s = { total: list.length, done: 0, prog: 0, idle: 0, new: 0 };
    list.forEach((d) => { s[statusOf(d)]++; });
    s.activePct = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return s;
  }
  const branchStats = (branchId) => statsFor(deedsOf(branchId));
  const globalStats = () => statsFor(deeds());

  /* ---------- عمليات التعديل ---------- */
  /* المركز الرئيسي: إسناد دفعة صكوك جديدة لفرع */
  function assignDeedsToBranch(branchId, count, mosqueBase) {
    const d = load();
    let maxId = d.deeds.reduce((m, x) => Math.max(m, parseInt(x.id.replace("SK-", "")) || 0), 1000);
    const created = [];
    for (let i = 0; i < count; i++) {
      const id = "SK-" + (++maxId);
      const rec = {
        id,
        mosque: mosqueBase ? `${mosqueBase} ${i + 1}` : "مسجد قيد التوثيق " + (i + 1),
        district: "—",
        city: branch(branchId)?.city || "—",
        branchId,
        assignedEmployeeId: null,
        step: 0,
        finalFile: null,
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [],
      };
      d.deeds.push(rec);
      created.push(rec);
    }
    save();
    return created;
  }

  /* الفرع: إسناد صك لموظف */
  function assignDeedToEmployee(deedId, empId) {
    const rec = deed(deedId);
    if (!rec) return;
    rec.assignedEmployeeId = empId || null;
    rec.updatedAt = new Date().toISOString();
    save();
  }
  function bulkAssign(deedIds, empId) {
    deedIds.forEach((id) => {
      const rec = deed(id);
      if (rec) { rec.assignedEmployeeId = empId; rec.updatedAt = new Date().toISOString(); }
    });
    save();
  }

  /* الموظف: التقدّم بخطوة في مسار العمل */
  function advanceDeed(deedId, finalFileName) {
    const rec = deed(deedId);
    if (!rec || rec.step >= DataGen.STEP_COUNT) return;
    rec.history.push({ step: rec.step, at: new Date().toISOString() });
    rec.step += 1;
    if (rec.step >= DataGen.STEP_COUNT) rec.finalFile = finalFileName || `${rec.id}.pdf`;
    rec.updatedAt = new Date().toISOString();
    save();
  }
  function revertDeed(deedId) {
    const rec = deed(deedId);
    if (!rec || rec.step <= 0) return;
    rec.step -= 1;
    rec.history.pop();
    if (rec.step < DataGen.STEP_COUNT) rec.finalFile = null;
    rec.updatedAt = new Date().toISOString();
    save();
  }

  /* ---------- الجلسة ---------- */
  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(obj) { localStorage.setItem(SESSION_KEY, JSON.stringify(obj)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  return {
    load, save, reset,
    statusOf, pctOf, statsFor,
    branches, employees, deeds, workflow,
    branch, employee, deed,
    employeesOf, deedsOf, deedsOfEmployee,
    branchStats, globalStats,
    assignDeedsToBranch, assignDeedToEmployee, bulkAssign,
    advanceDeed, revertDeed,
    session, setSession, clearSession,
  };
})();
