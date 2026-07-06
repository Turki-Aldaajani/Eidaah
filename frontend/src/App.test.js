import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the landing page placeholder at the root route", () => {
  render(<App />);
  expect(screen.getByText("landing placeholder")).toBeInTheDocument();
});
