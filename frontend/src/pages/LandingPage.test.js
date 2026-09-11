import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";
import { ThemeProvider } from "../theme/ThemeContext";
import { AIF } from "../data/curriculum";

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

test("قسم «ماذا يقدم إيضاح؟» يعرض كل المزايا ككروت لاصقة", () => {
  const { container } = renderLanding();
  AIF.forEach((feature) => {
    expect(screen.getByText(feature.t)).toBeInTheDocument();
  });
  expect(container.querySelectorAll(".stack-card")).toHaveLength(AIF.length);
});

test("مؤشر التمرير يظهر على الكرت الأول وحده", () => {
  const { container } = renderLanding();
  const cues = container.querySelectorAll(".scroll-cue");
  expect(cues).toHaveLength(1);
  expect(container.querySelectorAll(".stack-card")[0]).toContainElement(cues[0]);
});

test("يعرض سلوقن إيضاح الجديد في الهوم بيج", () => {
  renderLanding();
  expect(screen.getByText(/كل خطوة أوضح وكل هدف أقرب/)).toBeInTheDocument();
});
