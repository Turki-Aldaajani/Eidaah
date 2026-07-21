// اختبار منطق بحث المناهج C3 (#52) — دوال نقية، بلا تصيير.
import { searchCurriculum, normalizeAr, routableSubjects, levenshtein } from "./curriculumSearch";
import { LESSONS, STAGE_SUBJECTS } from "../data/curriculum";

describe("normalizeAr", () => {
  test("يزيل الحركات (harakat)", () => {
    expect(normalizeAr("مُعَلِّم")).toBe("معلم");
  });
  test("يوحّد الألف بأنواعها", () => {
    expect(normalizeAr("أحمد")).toBe("احمد");
    expect(normalizeAr("إسلام")).toBe("اسلام");
    expect(normalizeAr("آمن")).toBe("امن");
  });
  test("يوحّد التاء المربوطة والألف المقصورة", () => {
    expect(normalizeAr("مدرسة")).toBe("مدرسه");
    expect(normalizeAr("مصطفى")).toBe("مصطفي");
  });
  test("يتعامل مع الفراغ والقيم الفارغة", () => {
    expect(normalizeAr("  مرحبا   بك ")).toBe("مرحبا بك");
    expect(normalizeAr("")).toBe("");
    expect(normalizeAr(null)).toBe("");
  });
});

describe("searchCurriculum — الحالة 1: تطابق واضح (exact → redirect)", () => {
  test("سؤال واضح ينتقل مباشرة لصفحة الدرس الصحيحة", () => {
    const r = searchCurriculum("أريد درس الأعداد النسبية");
    expect(r.status).toBe("exact");
    expect(r.action).toBe("redirect");
    expect(r.results).toHaveLength(1);
    expect(r.results[0].url).toBe("/learn/m1/math/1/0");
    expect(r.results[0].lessonTitle).toBe("الأعداد النسبية");
  });

  test("اسم درس + مادة → تطابق دقيق", () => {
    const r = searchCurriculum("أعداد نسبية رياضيات");
    expect(r.status).toBe("exact");
    expect(r.results[0].subjectId).toBe("math");
    expect(r.results[0].url).toBe("/learn/m1/math/1/0");
  });

  test("درس من مادة العربية", () => {
    const r = searchCurriculum("المبتدأ والخبر");
    expect(r.status).toBe("exact");
    expect(r.results[0].subjectId).toBe("ar");
    expect(r.results[0].lessonTitle).toBe("المبتدأ والخبر");
  });

  test("درس من مهارات رقمية (سكراتش)", () => {
    const r = searchCurriculum("سكراتش");
    expect(r.status).toBe("exact");
    expect(r.results[0].subjectId).toBe("dig");
  });

  test("كشف المرحلة من النص يغيّر مسار التنقّل", () => {
    const r = searchCurriculum("درس الأعداد النسبية ثاني متوسط");
    expect(r.stageId).toBe("m2");
    expect(r.results[0].url).toBe("/learn/m2/math/1/0");
  });
});

describe("searchCurriculum — الحالة 2: غموض (multiple ≤4 → options)", () => {
  test("ذكر مادة فقط → عرض دروسها (≤4 خيارات)", () => {
    const r = searchCurriculum("أريد درس رياضيات");
    expect(r.status).toBe("multiple");
    expect(r.action).toBe("show_options");
    expect(r.results.length).toBeGreaterThan(1);
    expect(r.results.length).toBeLessThanOrEqual(4);
    expect(r.results.every((x) => x.subjectId === "math")).toBe(true);
  });

  test("كلمة مادة غامضة (بادئة) → خيارات", () => {
    const r = searchCurriculum("درس رياضي");
    expect(r.status).toBe("multiple");
    expect(r.results.length).toBeLessThanOrEqual(4);
  });

  test("لا يتجاوز 4 خيارات أبداً", () => {
    const r = searchCurriculum("مهارات رقمية");
    expect(r.results.length).toBeLessThanOrEqual(4);
  });
});

describe("searchCurriculum — الحالة 3: خارج النطاق (no_match → explain)", () => {
  test("مادة غير متاحة → رد لطيف بلا كسر", () => {
    const r = searchCurriculum("فيزياء نووية");
    expect(r.status).toBe("no_match");
    expect(r.action).toBe("explain");
    expect(r.results).toHaveLength(0);
    expect(typeof r.message).toBe("string");
    expect(r.message.length).toBeGreaterThan(0);
  });

  test("كلام لا صلة له → رد لطيف يذكر المتاح", () => {
    const r = searchCurriculum("مطعم بيتزা قريب");
    expect(r.status).toBe("no_match");
    expect(r.message).toContain("رياضيات");
  });

  test("استعلام فارغ لا يكسر", () => {
    const r = searchCurriculum("");
    expect(r.status).toBe("no_match");
    expect(r.results).toHaveLength(0);
  });
});

describe("المطابقة التقريبية والأخطاء الإملائية (Fuzzy)", () => {
  test("خطأ إملائي شائع في كلمة معرّبة يجد الدرس الصحيح", () => {
    for (const typo of ["سكراش", "سكرتش"]) {
      const r = searchCurriculum(typo);
      expect(r.results.length).toBeGreaterThanOrEqual(1);
      const dig = r.results.find((x) => x.subjectId === "dig");
      expect(dig).toBeTruthy();
      expect(dig.lessonTitle).toContain("سكراتش");
    }
  });

  test("عند التشابه التقريبي يعرض اقتراح 'هل تقصد؟' لا رسالة اعتذار", () => {
    const r = searchCurriculum("سكراش");
    expect(r.status).toBe("multiple");
    expect(r.action).toBe("show_options");
    expect(r.message).toContain("هل تقصد");
  });

  test("الاعتذار فقط عند انعدام أي تشابه", () => {
    const r = searchCurriculum("زغردة الديناصورات");
    expect(r.status).toBe("no_match");
  });

  test("levenshtein يحسب مسافة التحرير بدقة", () => {
    expect(levenshtein("سكراش", "سكراتش")).toBe(1);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("قيود القبول", () => {
  test("لا توليد — كل نتيجة موجودة فعلاً في فهرس LESSONS", () => {
    for (const q of ["الأعداد النسبية", "المبتدأ والخبر", "سكراتش", "رياضيات"]) {
      const r = searchCurriculum(q);
      for (const res of r.results) {
        expect(LESSONS[res.subjectId]).toContain(res.lessonTitle);
        expect(LESSONS[res.subjectId][res.lessonIdx]).toBe(res.lessonTitle);
      }
    }
  });

  test("لا يوجّه إلا لمواد النطاق المتاح للمرحلة", () => {
    const r = searchCurriculum("أريد درس رياضيات");
    for (const res of r.results) {
      expect(routableSubjects("m1")).toContain(res.subjectId);
    }
    // العربية متاحة على main ضمن STAGE_SUBJECTS.m1
    expect(STAGE_SUBJECTS.m1).toContain("ar");
  });

  test("زمن الاستجابة < 3 ثوانٍ (فوري فعلياً)", () => {
    const t0 = Date.now();
    for (let i = 0; i < 50; i++) searchCurriculum("أريد درس الأعداد النسبية");
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  test("confidence ضمن [0,1]", () => {
    for (const q of ["الأعداد النسبية", "رياضيات", "فيزياء"]) {
      const r = searchCurriculum(q);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});
