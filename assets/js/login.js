/* ==========================================================================
   login.js — اختيار الدور والجهة وبدء الجلسة
   ========================================================================== */
(function () {
  Store.load();

  const ROLES = [
    { role: "hq",       icon: "building",  title: "المركز الرئيسي (الوزارة)", desc: "متابعة جميع الفروع وإسناد الصكوك." },
    { role: "branch",   icon: "layers",    title: "مدير فرع",                 desc: "استقبال الصكوك وتوزيعها على الموظفين." },
    { role: "employee", icon: "userCheck", title: "موظف توثيق",               desc: "تنفيذ مسار توثيق الصكوك المسندة إليه." },
  ];

  let selected = null;
  const rolesBox = $("#roles");
  const ctxWrap = $("#ctxWrap");
  const ctxLabel = $("#ctxLabel");
  const ctxSelect = $("#ctxSelect");
  const loginBtn = $("#loginBtn");

  ROLES.forEach((r) => {
    const card = el("div", { class: "role-card", "data-role": r.role, onclick: () => selectRole(r.role) }, [
      el("div", { class: "r-ic", html: icon(r.icon, 22) }),
      el("div", { class: "grow" }, [ el("b", { text: r.title }), el("p", { text: r.desc }) ]),
      el("div", { class: "r-check", html: icon("check", 20) }),
    ]);
    rolesBox.append(card);
  });

  function selectRole(role) {
    selected = role;
    $$(".role-card").forEach((c) => c.classList.toggle("sel", c.dataset.role === role));

    if (role === "hq") {
      ctxWrap.classList.add("hidden");
      loginBtn.disabled = false;
    } else if (role === "branch") {
      ctxLabel.textContent = "اختر الفرع";
      ctxSelect.innerHTML = Store.branches()
        .map((b) => `<option value="${b.id}">${b.name}</option>`).join("");
      ctxWrap.classList.remove("hidden");
      loginBtn.disabled = false;
    } else {
      ctxLabel.textContent = "اختر الموظف";
      fillEmployees();
      ctxWrap.classList.remove("hidden");
      loginBtn.disabled = false;
    }
  }

  function fillEmployees() {
    /* موظفون من مختلف الفروع مع اسم الفرع للتوضيح */
    const opts = Store.employees().map((e) => {
      const b = Store.branch(e.branchId);
      return `<option value="${e.id}">${e.name} — ${b.name}</option>`;
    });
    ctxSelect.innerHTML = opts.join("");
  }

  loginBtn.addEventListener("click", () => {
    if (!selected) return;
    const sess = { role: selected };
    if (selected === "branch") {
      sess.branchId = ctxSelect.value;
      sess.name = Store.branch(sess.branchId).name;
      Store.setSession(sess);
      location.href = "branch.html";
    } else if (selected === "employee") {
      const emp = Store.employee(ctxSelect.value);
      sess.employeeId = emp.id;
      sess.branchId = emp.branchId;
      sess.name = emp.name;
      Store.setSession(sess);
      location.href = "employee.html";
    } else {
      sess.name = "إدارة المركز الرئيسي";
      Store.setSession(sess);
      location.href = "hq.html";
    }
  });
})();
