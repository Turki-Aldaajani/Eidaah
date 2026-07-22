import {
  STAGES,
  SUB_DEFS,
  STAGE_SUBJECTS,
  CHAPTERS,
  stageById,
  subjectsForStage,
  lessonsFor,
  toArabicDigits,
  fmtDurationSeconds,
  fmtViews,
  fmtRate,
  adaptApiVideos,
  defaultFilters,
  applyFilters,
} from "./curriculum";

// A real /api/lesson_videos-shaped sample, mirroring what the backend actually
// returns (video_recommender.to_public_video).
function sampleApiVideos() {
  return [
    { video_id: "a", title: "شرح ١", channel_title: "قناة أ", published_at: "2026-03-01T00:00:00Z", duration_seconds: 240, view_count: 1200000, approved: true, match_score: 230 },
    { video_id: "b", title: "شرح ٢", channel_title: "قناة ب", published_at: "2023-03-01T00:00:00Z", duration_seconds: 840, view_count: 98000, approved: false, match_score: 120 },
  ];
}

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

test("fmtDurationSeconds formats real seconds as an Arabic-digit mm:ss string", () => {
  expect(fmtDurationSeconds(245)).toMatch(/^[٠-٩]{2}:[٠-٩]{2}$/);
  expect(fmtDurationSeconds(245)).toBe("٠٤:٠٥");
});

test("fmtViews abbreviates large view counts in Arabic", () => {
  expect(fmtViews(1200000)).toContain("مليون");
  expect(fmtViews(98000)).toContain("ألف");
});

test("fmtRate formats a rating with an Arabic decimal separator", () => {
  expect(fmtRate(4.8)).toBe("٤٫٨");
});

test("adaptApiVideos maps every real API field without inventing any data", () => {
  const videos = adaptApiVideos(sampleApiVideos(), "math");
  expect(videos).toHaveLength(2);
  expect(videos[0]).toEqual(
    expect.objectContaining({
      video_id: "a",
      title: "شرح ١",
      ch: "قناة أ",
      ver: true,
      views: 1200000,
      year: 2026,
    })
  );
  expect(videos[0].rate).toBeGreaterThan(0);
  expect(videos[0].rate).toBeLessThanOrEqual(5);
  // "nat" never existed on the real API and must not appear on adapted videos.
  expect(videos[0]).not.toHaveProperty("nat");
});

test("applyFilters with defaultFilters returns every video unfiltered", () => {
  const videos = adaptApiVideos(sampleApiVideos(), "math");
  const result = applyFilters(videos, defaultFilters());
  expect(result).toHaveLength(videos.length);
});

test("applyFilters narrows by the approved-channel toggle", () => {
  const videos = adaptApiVideos(sampleApiVideos(), "math");
  const filters = { ...defaultFilters(), ver: true };
  const result = applyFilters(videos, filters);
  expect(result.every((v) => v.ver)).toBe(true);
  expect(result.length).toBeLessThan(videos.length);
});

test("SUB_DEFS has an entry for every subject id referenced by STAGE_SUBJECTS", () => {
  const allIds = new Set(Object.values(STAGE_SUBJECTS).flat());
  allIds.forEach((id) => expect(SUB_DEFS[id]).toBeDefined());
});
