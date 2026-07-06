import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";
import { ThemeProvider } from "../theme/ThemeContext";

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
