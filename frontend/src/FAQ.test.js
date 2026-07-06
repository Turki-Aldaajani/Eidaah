import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FAQ from "./FAQ";
import { ThemeProvider } from "./theme/ThemeContext";

function renderFaq() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <FAQ />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());

test("renders all three FAQ section headings", () => {
  renderFaq();
  expect(screen.getByText("التعريف بالمشروع")).toBeInTheDocument();
  expect(screen.getByText("الاستخدام والمميزات")).toBeInTheDocument();
  expect(screen.getByText("الدعم الفني")).toBeInTheDocument();
});

test("clicking a question opens it (adds the open class) and clicking again closes it", () => {
  renderFaq();
  const question = screen.getByText("ما هو مشروع إيضاح؟");
  const item = question.closest(".faq-item");
  expect(item).not.toHaveClass("open");
  fireEvent.click(question);
  expect(item).toHaveClass("open");
  fireEvent.click(question);
  expect(item).not.toHaveClass("open");
});
