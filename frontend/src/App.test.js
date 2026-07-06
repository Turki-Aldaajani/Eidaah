import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the landing page with both entry cards at the root route", () => {
  render(<App />);
  expect(screen.getByText("المناهج التعليمية")).toBeInTheDocument();
  expect(screen.getByText("حلّل ملفاتك التعليمية")).toBeInTheDocument();
});

test("redirects an unknown path back to the landing page", () => {
  window.history.pushState({}, "", "/some/unknown/path");
  render(<App />);
  expect(screen.getByText("المناهج التعليمية")).toBeInTheDocument();
});
