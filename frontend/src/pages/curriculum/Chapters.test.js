import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Chapters from "./Chapters";
import { ThemeProvider } from "../../theme/ThemeContext";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route path="/learn/:stageId/:subjectId" element={<Chapters />} />
          <Route path="/learn" element={<div>curriculum home</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

test("renders both semester chapter cards", () => {
  renderAt("/learn/m1/math");
  expect(screen.getByText("الفصل الدراسي الأول")).toBeInTheDocument();
  expect(screen.getByText("الفصل الدراسي الثاني")).toBeInTheDocument();
  const link = screen.getByText("الفصل الدراسي الأول").closest("a");
  expect(link).toHaveAttribute("href", "/learn/m1/math/1");
});

test("redirects to /learn for an unknown stage or subject", () => {
  renderAt("/learn/m1/not-a-real-subject");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});
