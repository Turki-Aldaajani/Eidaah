import {
  STAGES,
  STAGE_SUBJECTS,
  POC_STAGES,
  POC_SUBJECTS,
  SUB_DEFS,
  isStageAvailable,
  stageStatus,
  isSubjectAvailable,
  subjectStatus,
} from "./curriculum";

const AVAILABLE_STAGES = ["m1", "m2", "m3"];
const COMING_SOON_STAGES = ["p1", "p2", "p3", "p4", "p5", "p6", "h1", "h2", "h3"];
const VALID_STATUS = ["available", "coming_soon"];

describe("حالة المراحل (STAGES.status)", () => {
  test("كل مرحلة تملك status صالحاً", () => {
    STAGES.forEach((stage) => {
      expect(stage.status).toBeDefined();
      expect(VALID_STATUS).toContain(stage.status);
    });
  });

  test("المراحل المتوسطة m1/m2/m3 متاحة (available)", () => {
    AVAILABLE_STAGES.forEach((id) => {
      expect(STAGES.find((s) => s.id === id).status).toBe("available");
      expect(stageStatus(id)).toBe("available");
      expect(isStageAvailable(id)).toBe(true);
    });
  });

  test("الابتدائي p1-p6 والثانوي h1-h3 قادمة قريباً (coming_soon)", () => {
    COMING_SOON_STAGES.forEach((id) => {
      expect(STAGES.find((s) => s.id === id).status).toBe("coming_soon");
      expect(stageStatus(id)).toBe("coming_soon");
      expect(isStageAvailable(id)).toBe(false);
    });
  });

  test("POC_STAGES مُشتق من الحالة ويساوي المراحل المتاحة تماماً (توافق C1)", () => {
    expect(POC_STAGES).toEqual(AVAILABLE_STAGES);
  });
});

describe("حالة المواد (subjectStatus)", () => {
  test("POC_SUBJECTS يقتصر على رياضيات + مهارات رقمية (توافق C2)", () => {
    expect(POC_SUBJECTS).toEqual(["math", "dig"]);
  });

  test("رياضيات ومهارات رقمية متاحة في m1/m2/m3", () => {
    AVAILABLE_STAGES.forEach((stageId) => {
      ["math", "dig"].forEach((subject) => {
        expect(subjectStatus(stageId, subject)).toBe("available");
        expect(isSubjectAvailable(stageId, subject)).toBe(true);
      });
    });
  });

  test("باقي مواد المرحلة المتوسطة قادمة قريباً في m1/m2/m3", () => {
    const others = ["ar", "sci", "en", "isl", "soc"];
    AVAILABLE_STAGES.forEach((stageId) => {
      others.forEach((subject) => {
        expect(subjectStatus(stageId, subject)).toBe("coming_soon");
        expect(isSubjectAvailable(stageId, subject)).toBe(false);
      });
    });
  });

  test("جميع مواد المراحل غير المتاحة قادمة قريباً — حتى رياضيات ومهارات رقمية", () => {
    COMING_SOON_STAGES.forEach((stageId) => {
      (STAGE_SUBJECTS[stageId] || []).forEach((subject) => {
        expect(subjectStatus(stageId, subject)).toBe("coming_soon");
      });
    });
  });
});

describe("اكتمال البيانات — جميع المواد موجودة", () => {
  test("المراحل المتوسطة تُظهر جميع موادها (وليس فقط المتاحة)", () => {
    AVAILABLE_STAGES.forEach((stageId) => {
      ["ar", "math", "sci", "en", "isl", "soc", "dig"].forEach((subject) => {
        expect(STAGE_SUBJECTS[stageId]).toContain(subject);
      });
    });
  });

  test("كل معرّف مادة مُشار إليه في STAGE_SUBJECTS له تعريف في SUB_DEFS", () => {
    const allIds = new Set(Object.values(STAGE_SUBJECTS).flat());
    allIds.forEach((id) => expect(SUB_DEFS[id]).toBeDefined());
  });

  test("جميع المراحل الاثنتا عشرة ما زالت موجودة", () => {
    expect(STAGES).toHaveLength(12);
    [...AVAILABLE_STAGES, ...COMING_SOON_STAGES].forEach((id) => {
      expect(STAGES.some((s) => s.id === id)).toBe(true);
    });
  });
});
