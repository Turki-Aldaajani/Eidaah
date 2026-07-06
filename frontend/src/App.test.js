import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the landing page with both entry cards at the root route", () => {
  render(<App />);
  expect(screen.getByText("المناهج التعليمية")).toBeInTheDocument();
  expect(screen.getByText("حلّل ملفاتك التعليمية")).toBeInTheDocument();
});
