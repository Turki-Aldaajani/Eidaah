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

test("redirects to /learn for an unknown stage id", () => {
  renderAt("/learn/not-a-real-stage");
  expect(screen.getByText("curriculum home")).toBeInTheDocument();
});
