import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Subjects from "./Subjects";
import { ThemeProvider } from "../../theme/ThemeContext";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route path="/learn/:stageId" element={<Subjects />} />
          <Route path="/learn" element={<div>curriculum home</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

test("renders a card for every subject configured for the stage", () => {
  renderAt("/learn/m1");
  expect(screen.getByText("رياضيات")).toBeInTheDocument();
  expect(screen.getByText("علوم")).toBeInTheDocument();
  const link = screen.getByText("رياضيات").closest("a");
  expect(link).toHaveAttribute("href", "/learn/m1/math");
});

test("available subjects (math + digital skills) are clickable links", () => {
  renderAt("/learn/m1");
  expect(screen.getByText("رياضيات").closest("a")).toHaveAttribute("href", "/learn/m1/math");
  expect(screen.getByText("مهارات رقمية").closest("a")).toHaveAttribute("href", "/learn/m1/dig");
});

test("coming_soon subjects render a قريباً badge and are NOT clickable", () => {
  renderAt("/learn/m1");
  // علوم مادة قادمة قريباً في المرحلة المتوسطة
  const sciCard = screen.getByText("علوم").closest("[data-testid='coming-soon-subject']");
  expect(sciCard).toBeInTheDocument();
  expect(sciCard).toHaveClass("subject-card--locked");
  expect(screen.getByText("علوم").closest("a")).toBeNull();
  // شارة "قريباً" ظاهرة لكل مادة مقفولة (ar/sci/en/isl/soc = 5)
  expect(screen.getAllByText("قريباً").length).toBeGreaterThan(0);
});

test("redirects to /learn for an unknown stage id", () => {
  renderAt("/learn/not-a-real-stage");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});
