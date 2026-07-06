import { render } from "@testing-library/react";
import Icon from "./Icon";

test("renders a known outline icon with the ic class and expected path markup", () => {
  const { container } = render(<Icon name="check" />);
  const svg = container.querySelector("svg.ic");
  expect(svg).toBeInTheDocument();
  expect(svg.innerHTML).toContain("M5 12.5l4.6 4.6L19 7.4");
});

test("appends a custom className alongside the base ic class", () => {
  const { container } = render(<Icon name="video" className="h-ico" />);
  expect(container.querySelector("svg.ic.h-ico")).toBeInTheDocument();
});

test("renders an empty svg without crashing for an unknown icon name", () => {
  const { container } = render(<Icon name="does-not-exist" />);
  const svg = container.querySelector("svg.ic");
  expect(svg).toBeInTheDocument();
  expect(svg.innerHTML).toBe("");
});

test("renders the filled star icon using fill instead of stroke", () => {
  const { container } = render(<Icon name="star" filled />);
  const svg = container.querySelector("svg.ic");
  expect(svg).toHaveAttribute("fill", "currentColor");
  expect(svg.innerHTML).toContain("M12 3.4l2.7 5.5");
});
