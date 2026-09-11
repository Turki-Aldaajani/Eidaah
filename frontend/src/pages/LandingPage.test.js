import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";
import { ThemeProvider } from "../theme/ThemeContext";
import { LP_JOURNEY } from "../data/landing";

function renderLanding() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LandingPage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

test("renders both entry-point cards with their headings", () => {
  renderLanding();
  expect(screen.getByText("المناهج التعليمية")).toBeInTheDocument();
  expect(screen.getByText("حلّل ملفاتك التعليمية")).toBeInTheDocument();
});

test("the curriculum card links to /learn and the analyzer card links to /analyze", () => {
  renderLanding();
  expect(screen.getByText("المناهج التعليمية").closest("a")).toHaveAttribute("href", "/learn");
  expect(screen.getByText("حلّل ملفاتك التعليمية").closest("a")).toHaveAttribute("href", "/analyze");
});

test("مسار «رحلتك مع إيضاح» يتعرّج: صفوف متناوبة يصل بينها منحنى", () => {
  const { container } = renderLanding();
  const rows = container.querySelectorAll(".jrz-row");
  expect(rows).toHaveLength(LP_JOURNEY.length);
  expect(container.querySelectorAll(".jrz-link")).toHaveLength(LP_JOURNEY.length - 1);
  LP_JOURNEY.forEach((step, i) => {
    expect(screen.getByText(step.t)).toBeInTheDocument();
    expect(rows[i].classList.contains("alt")).toBe(i % 2 === 1);
  });
});

test("يعرض سلوقن إيضاح الجديد في الهوم بيج", () => {
  renderLanding();
  expect(screen.getByText(/كل خطوة أوضح وكل هدف أقرب/)).toBeInTheDocument();
});
