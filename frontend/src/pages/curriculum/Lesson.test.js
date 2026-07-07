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
