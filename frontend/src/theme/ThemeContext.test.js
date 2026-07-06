import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

function Consumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

test("defaults to light when no saved preference and no dark preference", () => {
  render(<ThemeProvider><Consumer /></ThemeProvider>);
  expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
  expect(document.documentElement.getAttribute("data-theme")).toBeNull();
});

test("toggle switches to dark, sets data-theme, and persists to localStorage", () => {
  render(<ThemeProvider><Consumer /></ThemeProvider>);
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(localStorage.getItem("eidaah-theme")).toBe("dark");
});

test("reads persisted theme on mount", () => {
  localStorage.setItem("eidaah-theme", "dark");
  render(<ThemeProvider><Consumer /></ThemeProvider>);
  expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
});
