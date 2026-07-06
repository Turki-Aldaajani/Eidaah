import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopNav from "./TopNav";
import { ThemeProvider } from "../theme/ThemeContext";

function renderTopNav() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <TopNav />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

test("renders the brand name", () => {
  renderTopNav();
  expect(screen.getByText("إيضاح")).toBeInTheDocument();
});

test("clicking the theme toggle switches the document theme", () => {
  renderTopNav();
  const toggleBtn = screen.getByRole("button", { name: "تبديل الوضع الليلي" });
  expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  fireEvent.click(toggleBtn);
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  fireEvent.click(toggleBtn);
  expect(document.documentElement.getAttribute("data-theme")).toBeNull();
});
