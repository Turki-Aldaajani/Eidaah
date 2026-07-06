import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CurriculumHome from "./CurriculumHome";
import { ThemeProvider } from "../../theme/ThemeContext";

function renderHome() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <CurriculumHome />
      </ThemeProvider>
    </MemoryRouter>
  );
}

test("renders all three level group headings", () => {
  renderHome();
  expect(screen.getByText("المرحلة الابتدائية")).toBeInTheDocument();
  expect(screen.getByText("المرحلة المتوسطة")).toBeInTheDocument();
  expect(screen.getByText("المرحلة الثانوية")).toBeInTheDocument();
});

test("renders a card for every stage, linking to /learn/:stageId", () => {
  renderHome();
  const link = screen.getByText("الصف الأول المتوسط").closest("a");
  expect(link).toHaveAttribute("href", "/learn/m1");
});
