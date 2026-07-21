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

test("available middle stages (m1/m2/m3) are clickable links", () => {
  renderHome();
  ["الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط"].forEach((name) => {
    expect(screen.getByText(name).closest("a")).not.toBeNull();
  });
});

test("coming_soon stages are locked, non-clickable, and show a قريباً badge", () => {
  renderHome();
  // الابتدائي والثانوي = 9 مراحل قادمة قريباً
  expect(screen.getAllByText("قريباً")).toHaveLength(9);
  // مرحلة ابتدائية غير قابلة للنقر (بطاقة مقفولة وليست رابطاً)
  const p1Card = screen.getByText("الصف الأول الابتدائي").closest(".grade-card");
  expect(p1Card).toHaveClass("grade-card--locked");
  expect(screen.getByText("الصف الأول الابتدائي").closest("a")).toBeNull();
});
