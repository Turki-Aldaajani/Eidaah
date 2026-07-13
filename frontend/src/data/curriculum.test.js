import {
  STAGES,
  SUB_DEFS,
  STAGE_SUBJECTS,
  CHAPTERS,
  stageById,
  subjectsForStage,
  lessonsFor,
  toArabicDigits,
  fmtDur,
  fmtViews,
  fmtRate,
  mockVideos,
  defaultFilters,
  applyFilters,
} from "./curriculum";

test("STAGES has 12 grades across 3 levels", () => {
  expect(STAGES).toHaveLength(12);
  expect(STAGES.filter((s) => s.lv === "primary")).toHaveLength(6);
  expect(STAGES.filter((s) => s.lv === "middle")).toHaveLength(3);
  expect(STAGES.filter((s) => s.lv === "high")).toHaveLength(3);
});

test("stageById finds a stage by id", () => {
  expect(stageById("m1").n).toBe("الصف الأول المتوسط");
  expect(stageById("does-not-exist")).toBeUndefined();
});

test("subjectsForStage returns the subject ids configured for that grade", () => {
  expect(subjectsForStage(stageById("m1"))).toEqual(STAGE_SUBJECTS.m1);
});

test("CHAPTERS has exactly 2 semesters", () => {
  expect(CHAPTERS).toHaveLength(2);
});

test("lessonsFor returns 6 lessons with title/minutes/difficulty for a known subject", () => {
  const lessons = lessonsFor("math");
  expect(lessons).toHaveLength(6);
  expect(lessons[0]).toEqual(
    expect.objectContaining({ t: expect.any(String), min: expect.any(Number), diff: expect.any(Object) })
  );
});

test("lessonsFor resolves aliased subjects (lgty/art/pe/digtech/bus) to their own lesson lists", () => {
  expect(lessonsFor("lgty")[0].t).toBe("القراءة والفهم");
  expect(lessonsFor("bus")[0].t).toBe("مفهوم إدارة الأعمال");
});

test("toArabicDigits converts western digits to eastern-arabic digits", () => {
  expect(toArabicDigits(2026)).toBe("٢٠٢٦");
});

test("fmtDur formats minutes as an Arabic-digit mm:ss string", () => {
  expect(fmtDur(4)).toMatch(/^[٠-٩]{2}:[٠-٩]{2}$/);
});

test("fmtViews abbreviates large view counts in Arabic", () => {
  expect(fmtViews(1200000)).toContain("مليون");
  expect(fmtViews(98000)).toContain("ألف");
});

test("fmtRate formats a rating with an Arabic decimal separator", () => {
  expect(fmtRate(4.8)).toBe("٤٫٨");
});

test("mockVideos builds one video entry per VIDS_META row with a title containing the lesson text", () => {
  const lesson = lessonsFor("math")[0];
  const videos = mockVideos(lesson, "math");
  expect(videos.length).toBeGreaterThan(0);
  expect(videos[0].title).toContain(lesson.t);
});

test("applyFilters with defaultFilters returns every video unfiltered", () => {
  const lesson = lessonsFor("math")[0];
  const videos = mockVideos(lesson, "math");
  const result = applyFilters(videos, defaultFilters());
  expect(result).toHaveLength(videos.length);
});

test("applyFilters narrows by duration", () => {
  const lesson = lessonsFor("math")[0];
  const videos = mockVideos(lesson, "math");
  const filters = { ...defaultFilters(), dur: "lt10" };
  const result = applyFilters(videos, filters);
  expect(result.every((v) => v.durM < 10)).toBe(true);
  expect(result.length).toBeLessThan(videos.length);
});

test("SUB_DEFS has an entry for every subject id referenced by STAGE_SUBJECTS", () => {
  const allIds = new Set(Object.values(STAGE_SUBJECTS).flat());
  allIds.forEach((id) => expect(SUB_DEFS[id]).toBeDefined());
});
