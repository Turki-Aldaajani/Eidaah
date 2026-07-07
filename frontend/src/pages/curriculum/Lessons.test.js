import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Lessons from "./Lessons";
import { ThemeProvider } from "../../theme/ThemeContext";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route path="/learn/:stageId/:subjectId/:chapterId" element={<Lessons />} />
          <Route path="/learn" element={<div>curriculum home</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

test("renders all 6 lessons for the subject", () => {
  renderAt("/learn/m1/math/1");
  expect(screen.getByText("الأعداد النسبية")).toBeInTheDocument();
  expect(screen.getByText("النسبة المئوية والتناسب")).toBeInTheDocument();
  const link = screen.getByText("الأعداد النسبية").closest("a");
  expect(link).toHaveAttribute("href", "/learn/m1/math/1/0");
});

test("redirects to /learn for an unknown chapter id", () => {
  renderAt("/learn/m1/math/99");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});
