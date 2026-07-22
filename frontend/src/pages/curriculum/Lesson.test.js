import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Lesson from "./Lesson";
import { ThemeProvider } from "../../theme/ThemeContext";

// The progress ring renders the percentage and "مكتمل" as sibling elements
// (<b>{pct}٪</b><span>مكتمل</span>) with no connecting text node between them,
// so a plain getByText("٢٠٪ مكتمل") can't match a single node. This is the
// standard RTL recipe for text split across elements, tolerant of the missing
// space Babel produces when JSX children sit on separate lines.
function textMatcher(text) {
  const target = text.replace(/\s+/g, "");
  return (_content, node) => {
    const hasText = (n) => n.textContent.replace(/\s+/g, "") === target;
    const nodeHasText = hasText(node);
    const childrenDontHaveText = Array.from(node?.children || []).every((child) => !hasText(child));
    return nodeHasText && childrenDontHaveText;
  };
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route path="/learn/:stageId/:subjectId/:chapterId/:lessonIdx" element={<Lesson />} />
          <Route path="/learn" element={<div>curriculum home</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

// Real /api/lesson_videos response shape (C4) — Lesson fetches and adapts this.
const SAMPLE_VIDEOS = [
  {
    video_id: "abc123",
    title: "شرح تجريبي للقوى والأسس",
    url: "https://www.youtube.com/watch?v=abc123",
    thumbnail_url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    channel_title: "قناة تجريبية",
    channel_id: "chan1",
    published_at: "2026-01-01T00:00:00Z",
    duration_seconds: 300,
    view_count: 1000,
    approved: true,
    badge: "قناة معتمدة",
    source: "youtube",
    match_score: 200,
  },
];

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ videos: SAMPLE_VIDEOS, count: SAMPLE_VIDEOS.length, cached: false }),
  });
});

afterEach(() => {
  delete global.fetch;
});

test("renders the lesson title and progress ring starting at 0%", async () => {
  renderAt("/learn/m1/math/1/1");
  // The lesson title also appears in the breadcrumb trail, so scope to the
  // page heading (the h1) rather than a plain getByText, which would match both.
  expect(screen.getByRole("heading", { name: "القوى والأسس" })).toBeInTheDocument();
  expect(screen.getByText(textMatcher("٠٪ مكتمل"))).toBeInTheDocument();
  await screen.findAllByLabelText("تشغيل الشرح"); // let the pending videos fetch settle
});

test("opening the video modal marks the video step done and advances progress", async () => {
  renderAt("/learn/m1/math/1/1");
  const [playButton] = await screen.findAllByLabelText("تشغيل الشرح");
  fireEvent.click(playButton);
  expect(screen.getByText(textMatcher("٢٠٪ مكتمل"))).toBeInTheDocument();
});

test("fetches real videos for the lesson from the backend", async () => {
  renderAt("/learn/m1/math/1/1");
  await screen.findByText("شرح تجريبي للقوى والأسس");
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/lesson_videos?"));
  const calledUrl = new URL(global.fetch.mock.calls[0][0]);
  expect(calledUrl.searchParams.get("lesson")).toBe("القوى والأسس");
  expect(calledUrl.searchParams.get("subject_id")).toBe("math");
});

test("shows a message instead of the filter bar when no videos are found", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ videos: [], count: 0, cached: false }) });
  renderAt("/learn/m1/math/1/1");
  await screen.findByText("لا توجد شروحات لهذا الدرس حالياً.");
});

test("redirects to /learn for an out-of-range lesson index", () => {
  renderAt("/learn/m1/math/1/99");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});
