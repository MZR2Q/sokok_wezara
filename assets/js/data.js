/* ==========================================================================
   data.js — توليد البيانات التجريبية (الفروع، الموظفون، الصكوك)
   يستخدم مولّد أرقام عشوائية ببذرة ثابتة لضمان تطابق البيانات في كل تحميل.
   ========================================================================== */

const DataGen = (() => {
  /* مولّد عشوائي حتمي (mulberry32) */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng(20260811);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString();

  /* ---------- مراحل مسار العمل (workflow) ---------- */
  const WORKFLOW = [
    { key: "receive",  title: "استلام الصك وفتح الملف",       desc: "تسجيل الصك في النظام وفتح ملف المعاملة." },
    { key: "entity",   title: "مراجعة بيانات الجهة (المسجد)",  desc: "التحقق من اسم المسجد وموقعه وبيانات المتبرّع/الواقف." },
    { key: "docs",     title: "حصر وتدقيق الوثائق",           desc: "جمع صك الملكية والمخططات والوثائق المؤيدة وتدقيقها." },
    { key: "branch",   title: "المراجعة الفنية بالفرع",        desc: "اعتماد المراجعة الأولية من الفرع المختص." },
    { key: "ministry", title: "مراجعة الوزارة",               desc: "رفع المعاملة للمركز الرئيسي (الوزارة) للتدقيق النهائي." },
    { key: "confirm",  title: "اعتماد وتأكيد الصك",           desc: "اعتماد الصك رسمياً بعد اكتمال المتطلبات." },
    { key: "attach",   title: "إرفاق الصك النهائي وأرشفته",    desc: "رفع نسخة الصك الموثّق النهائي وأرشفة المعاملة." },
  ];
  const STEP_COUNT = WORKFLOW.length;

  /* ---------- الفروع (16) ---------- */
  const BRANCH_NAMES = [
    "فرع منطقة الرياض", "فرع منطقة مكة المكرمة", "فرع منطقة المدينة المنورة",
    "فرع منطقة القصيم", "فرع المنطقة الشرقية", "فرع منطقة عسير",
    "فرع منطقة تبوك", "فرع منطقة حائل", "فرع منطقة جازان",
    "فرع منطقة نجران", "فرع منطقة الباحة", "فرع منطقة الجوف",
    "فرع منطقة الحدود الشمالية", "فرع محافظة جدة", "فرع محافظة الطائف",
    "فرع محافظة الأحساء",
  ];
  const CITIES = ["الرياض","مكة المكرمة","المدينة المنورة","بريدة","الدمام","أبها","تبوك","حائل","جازان","نجران","الباحة","سكاكا","عرعر","جدة","الطائف","الهفوف"];

  /* ---------- أسماء الموظفين ---------- */
  const FIRST = ["عبدالله","محمد","خالد","سعد","فهد","عبدالعزيز","ناصر","سلطان","تركي","بندر","ماجد","يوسف","إبراهيم","عمر","صالح","أحمد","فيصل","مشعل"];
  const LAST  = ["القحطاني","الغامدي","الشهري","العتيبي","الدوسري","الحربي","المطيري","الزهراني","السبيعي","البقمي","الشمري","العمري","الرشيدي","المالكي","الأحمدي","الجهني"];

  /* ---------- مكوّنات أسماء المساجد ---------- */
  const M_TYPE = ["جامع", "مسجد"];
  const M_NAME = ["النور","التقوى","الفرقان","الرحمة","الهدى","الإيمان","الفاروق","الصديق","بلال بن رباح","خالد بن الوليد","الملك فهد","الأمير سلطان","الرشيد","الراجحي","السلام","الفتح","قباء","الإخلاص","الصفا","الوفاء","الرضوان","المهاجرين","الأنصار","الحرمين"];
  const DISTRICTS = ["حي النزهة","حي الروضة","حي الملز","حي العزيزية","حي السلامة","حي الشفا","حي المروج","حي النسيم","حي الفيصلية","حي الخالدية","حي المنار","حي الربوة","حي اليرموك","حي السويدي","حي بدر"];

  function mosqueName() {
    if (R() < 0.35) return `${pick(M_TYPE)} ${pick(["الملك فهد","الأمير سلطان","الأمير نايف","الشيخ عبدالله"])}`;
    return `${pick(M_TYPE)} ${pick(M_NAME)}`;
  }

  /* توليد كامل البيانات */
  function generate() {
    const branches = [];
    const employees = [];
    const deeds = [];
    let empId = 1, deedId = 1000;

    BRANCH_NAMES.forEach((bname, bi) => {
      const branchId = "B" + (bi + 1);
      const empCount = int(3, 6);
      const branchEmpIds = [];

      for (let e = 0; e < empCount; e++) {
        const id = "E" + empId++;
        const name = `${pick(FIRST)} ${pick(LAST)}`;
        employees.push({ id, branchId, name, role: e === 0 ? "مدير الفرع" : "باحث توثيق" });
        branchEmpIds.push(id);
      }

      /* عدد صكوك متفاوت لكل فرع لإظهار تنوّع الأحجام */
      const deedCount = int(40, 170);
      for (let d = 0; d < deedCount; d++) {
        const id = "SK-" + (deedId++);
        /* توزيع الحالات: بعضها خامل، بعضها جارٍ، بعضها منتهٍ، وبعضها غير موزّع */
        const roll = R();
        let assignedEmployeeId = null, step = 0, statusSeed;
        if (roll < 0.14) {            /* غير موزّع على موظف */
          statusSeed = "new"; step = 0;
        } else if (roll < 0.34) {     /* خامل (موزّع لكن لم يبدأ) */
          statusSeed = "idle"; step = 0; assignedEmployeeId = pick(branchEmpIds);
        } else if (roll < 0.72) {     /* جارٍ العمل */
          statusSeed = "prog"; step = int(1, STEP_COUNT - 1); assignedEmployeeId = pick(branchEmpIds);
        } else {                       /* منتهٍ */
          statusSeed = "done"; step = STEP_COUNT; assignedEmployeeId = pick(branchEmpIds);
        }

        const assignedAt = daysAgoISO(int(2, 220));
        const updatedAt  = statusSeed === "idle" ? assignedAt : daysAgoISO(int(0, 60));

        /* بناء سجل الخطوات المنجزة */
        const history = [];
        for (let s = 0; s < step; s++) {
          history.push({ step: s, at: daysAgoISO(int(1, 200)) });
        }

        deeds.push({
          id,
          mosque: mosqueName(),
          district: pick(DISTRICTS),
          city: CITIES[bi],
          branchId,
          assignedEmployeeId,
          step,                 /* عدد الخطوات المكتملة */
          finalFile: statusSeed === "done" ? `${id}.pdf` : null,
          assignedAt,
          updatedAt,
          history,
        });
      }
    });

    return { branches: buildBranches(), employees, deeds, workflow: WORKFLOW };

    function buildBranches() {
      return BRANCH_NAMES.map((name, i) => ({
        id: "B" + (i + 1),
        name,
        city: CITIES[i],
        code: "F" + String(i + 1).padStart(2, "0"),
      }));
    }
  }

  return { generate, WORKFLOW, STEP_COUNT };
})();
