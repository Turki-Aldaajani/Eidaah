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
  videoFromApi,
  defaultFilters,
  applyFilters,
} from "./curriculum";

const API_VIDEO = {
  video_id: "yt1",
  title: "شرح الأعداد النسبية",
  channel_title: "أكاديمية سعيد الشلوي",
  approved: true,
  badge: "قناة معتمدة",
  duration_seconds: 754, // 12:34
  view_count: 250000,
  like_count: 10000,
  published_at: "2025-06-01T00:00:00Z",
  url: "https://www.youtube.com/watch?v=yt1",
};

test("videoFromApi maps real backend fields into the VideoGrid shape", () => {
  const v = videoFromApi(API_VIDEO, "math", 0);
  expect(v.title).toBe("شرح الأعداد النسبية");
  expect(v.ver).toBe(true); // approved -> verified badge
  expect(v.approved).toBe(true);
  expect(v.badge).toBe("قناة معتمدة");
  expect(v.year).toBe(2025);
  expect(v.views).toBe(250000);
  expect(v.durM).toBeCloseTo(754 / 60, 5);
  expect(v.dur).toBe("١٢:٣٤"); // mm:ss in Arabic digits
  expect(v.icn).toBe(SUB_DEFS.math.icn);
  expect(Array.isArray(v.g)).toBe(true);
  expect(v.match).toHaveProperty("t"); // VideoCard reads match.t / match.cls
});

test("videoFromApi defaults dialect to 'sa' and derives a rating in 4.0–5.0", () => {
  const v = videoFromApi(API_VIDEO, "math", 0);
  expect(v.nat).toBe("sa");
  expect(v.rate).toBeGreaterThanOrEqual(4.0);
  expect(v.rate).toBeLessThanOrEqual(5.0);
  // no engagement data -> neutral default rating
  expect(videoFromApi({ video_id: "x", view_count: 0, like_count: 0 }, "math", 0).rate).toBe(4.6);
});

test("mapped videos work with the existing (unchanged) applyFilters", () => {
  const mapped = [
    videoFromApi(API_VIDEO, "math", 0),
    videoFromApi({ ...API_VIDEO, video_id: "yt2", approved: false, badge: null,
      duration_seconds: 120, view_count: 500, published_at: "2022-01-01T00:00:00Z" }, "math", 1),
  ];
  // "approved channel" filter keeps only the verified one
  expect(applyFilters(mapped, { ...defaultFilters(), ver: true })).toHaveLength(1);
  // "newest" recency filter (>= 2025) drops the 2022 video
  expect(applyFilters(mapped, { ...defaultFilters(), rec: "y2" }).every((v) => v.year >= 2025)).toBe(true);
  // most-viewed filter (>= 50k) keeps the popular one only
  expect(applyFilters(mapped, { ...defaultFilters(), views: "v50k" })).toHaveLength(1);
});

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

test("applyFilters narrows by nationality", () => {
  const lesson = lessonsFor("math")[0];
  const videos = mockVideos(lesson, "math");
  const filters = { ...defaultFilters(), nat: "sa" };
  const result = applyFilters(videos, filters);
  expect(result.every((v) => v.nat === "sa")).toBe(true);
  expect(result.length).toBeLessThan(videos.length);
});

test("SUB_DEFS has an entry for every subject id referenced by STAGE_SUBJECTS", () => {
  const allIds = new Set(Object.values(STAGE_SUBJECTS).flat());
  allIds.forEach((id) => expect(SUB_DEFS[id]).toBeDefined());
});
