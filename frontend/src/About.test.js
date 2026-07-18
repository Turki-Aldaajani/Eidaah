import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "./About";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider } from "./i18n/LanguageContext";

function renderAbout() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LanguageProvider>
          <About />
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());

test("renders team members grouped under the shared tm-group classes", () => {
  const { container } = renderAbout();
  expect(screen.getByText("ليان المطيويع")).toBeInTheDocument();
  expect(screen.getByText("فيصل التويجري")).toBeInTheDocument();
  expect(container.querySelectorAll(".tm-group").length).toBeGreaterThan(0);
});

test("toggling the language switches team names to English", () => {
  renderAbout();
  fireEvent.click(screen.getByText("English"));
  expect(screen.getByText("Turki Al-Dajani")).toBeInTheDocument();
});
