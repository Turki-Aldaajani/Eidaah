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
  expect(screen.getByText("ليان القباني")).toBeInTheDocument();
  expect(screen.getByText("عبدالعزيز الضيف")).toBeInTheDocument();
  expect(container.querySelectorAll(".tm-group").length).toBeGreaterThan(0);
});

test("قائد المشروع أول قسم، ويظهر تركي مرة ثانية ضمن فريق الـ Backend", () => {
  const { container } = renderAbout();
  const headings = [...container.querySelectorAll(".tm-role h3")].map((h) => h.textContent);
  expect(headings[0]).toBe("قائد المشروع");
  expect(headings[1]).toBe("مهندس AI/NLP");
  expect(headings[2]).toBe("الواجهة الخلفية (Backend)");
  expect(screen.getAllByText("تركي الدعجاني")).toHaveLength(2);
});

test("toggling the language switches team names to English", () => {
  renderAbout();
  fireEvent.click(screen.getByText("English"));
  // مرّتان: قائد المشروع وفريق الـ Backend
  expect(screen.getAllByText("Turki Al-Dajani")).toHaveLength(2);
  expect(screen.getByText("Project Lead")).toBeInTheDocument();
});
