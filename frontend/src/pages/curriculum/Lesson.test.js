import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Lesson from "./Lesson";
import { ThemeProvider } from "../../theme/ThemeContext";

// Lesson now fetches real recommendations from /api/lesson_videos. By default we
// reject so it deterministically falls back to the local mock (no real network),
// exactly as it would when the backend is unreachable.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.reject(new Error("no api")));
});
afterEach(() => {
  delete global.fetch;
});

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

test("renders the lesson title and progress ring starting at 0%", () => {
  renderAt("/learn/m1/math/1/1");
  // The lesson title also appears in the breadcrumb trail, so scope to the
  // page heading (the h1) rather than a plain getByText, which would match both.
  expect(screen.getByRole("heading", { name: "القوى والأسس" })).toBeInTheDocument();
  expect(screen.getByText(textMatcher("٠٪ مكتمل"))).toBeInTheDocument();
});

test("opening the video modal marks the video step done and advances progress", () => {
  renderAt("/learn/m1/math/1/1");
  fireEvent.click(screen.getAllByLabelText("تشغيل الشرح")[0]);
  expect(screen.getByText(textMatcher("٢٠٪ مكتمل"))).toBeInTheDocument();
});

test("redirects to /learn for an out-of-range lesson index", () => {
  renderAt("/learn/m1/math/1/99");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});

test("replaces the mock videos with real recommendations from /api/lesson_videos", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({
        videos: [
          {
            video_id: "yt123",
            title: "شرح القوى والأسس من قناة معتمدة",
            channel_title: "أكاديمية سعيد الشلوي",
            approved: true,
            badge: "قناة معتمدة",
            duration_seconds: 640,
            view_count: 250000,
            like_count: 9000,
            published_at: "2026-02-01T00:00:00Z",
            url: "https://www.youtube.com/watch?v=yt123",
          },
        ],
        count: 1,
        cached: false,
      }),
    })
  );

  renderAt("/learn/m1/math/1/1");
  // real backend title arrives and is shown
  expect(await screen.findByText("شرح القوى والأسس من قناة معتمدة")).toBeInTheDocument();
  // it replaced the mock (the mock builds titles like "القوى والأسس | ...")
  expect(screen.queryByText(/\| شرح مبسط وسريع$/)).not.toBeInTheDocument();
});

test("keeps the local mock videos when the API call fails", async () => {
  // default beforeEach fetch rejects
  renderAt("/learn/m1/math/1/1");
  // mock-shaped titles (lesson | type) remain as the fallback (8 mock videos)
  const fallbackCards = await screen.findAllByText(/القوى والأسس \|/);
  expect(fallbackCards.length).toBeGreaterThan(0);
});
