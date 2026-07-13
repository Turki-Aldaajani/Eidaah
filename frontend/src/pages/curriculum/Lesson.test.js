import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Lesson from "./Lesson";
import { ThemeProvider } from "../../theme/ThemeContext";
import { fetchLessonVideos } from "../../data/curriculum";

// Lesson.js now fetches real videos asynchronously via fetchLessonVideos - stub
// it so these tests don't depend on a real API key/network call and stay fast
// and deterministic.
jest.mock("../../data/curriculum", () => ({
  ...jest.requireActual("../../data/curriculum"),
  fetchLessonVideos: jest.fn(),
}));

const SAMPLE_VIDEO = {
  videoId: "abc123",
  title: "شرح تجريبي",
  ch: "قناة تجريبية",
  init: "ق",
  thumbnail: null,
  dur: "٠٤:٢٠",
  durM: 4,
  views: 1000,
  viewsT: "١ ألف",
  year: 2026,
  icn: "calculator",
};

// CRA's default jest config sets `resetMocks: true`, which wipes any mock
// implementation set inside the jest.mock() factory before every test - so
// the implementation must be (re)installed here instead.
beforeEach(() => {
  fetchLessonVideos.mockResolvedValue([SAMPLE_VIDEO]);
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

test("renders the lesson title and progress ring starting at 0%", async () => {
  renderAt("/learn/m1/math/1/1");
  // The lesson title also appears in the breadcrumb trail, so scope to the
  // page heading (the h1) rather than a plain getByText, which would match both.
  expect(screen.getByRole("heading", { name: "القوى والأسس" })).toBeInTheDocument();
  expect(screen.getByText(textMatcher("٠٪ مكتمل"))).toBeInTheDocument();
  // Let the async video fetch (mocked) settle before the test ends, so its
  // state update doesn't land after RTL's cleanup and bleed into the next test.
  await screen.findAllByLabelText("تشغيل الشرح");
});

test("opening the video modal marks the video step done and advances progress", async () => {
  renderAt("/learn/m1/math/1/1");
  fireEvent.click((await screen.findAllByLabelText("تشغيل الشرح"))[0]);
  expect(screen.getByText(textMatcher("٢٠٪ مكتمل"))).toBeInTheDocument();
});

test("redirects to /learn for an out-of-range lesson index", () => {
  renderAt("/learn/m1/math/1/99");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});
