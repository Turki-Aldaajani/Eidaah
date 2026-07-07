import { render, screen, fireEvent } from "@testing-library/react";
import Quiz from "./Quiz";

const questions = [
  { q: "س١؟", o: ["أ", "ب", "ج", "د"], a: 0 },
  { q: "س٢؟", o: ["أ", "ب", "ج", "د"], a: 1 },
  { q: "س٣؟", o: ["أ", "ب", "ج", "د"], a: 2 },
  { q: "س٤؟", o: ["أ", "ب", "ج", "د"], a: 3 },
  { q: "س٥؟", o: ["أ", "ب", "ج", "د"], a: 0 },
];

test("renders all 5 questions with 4 options each", () => {
  render(<Quiz questions={questions} onFirstCorrectSubmit={() => {}} />);
  questions.forEach((q) => expect(screen.getByText(q.q)).toBeInTheDocument());
  expect(screen.getAllByText("أ")).toHaveLength(5);
});

test("warns instead of submitting when not every question is answered", () => {
  render(<Quiz questions={questions} onFirstCorrectSubmit={() => {}} />);
  fireEvent.click(screen.getByText("صحّح إجاباتي"));
  expect(screen.getByText(/بقي/)).toBeInTheDocument();
});

test("submitting after answering everything shows the score and calls onFirstCorrectSubmit", () => {
  const onFirstCorrectSubmit = jest.fn();
  render(<Quiz questions={questions} onFirstCorrectSubmit={onFirstCorrectSubmit} />);
  questions.forEach((q, qi) => {
    const options = screen.getAllByText("أ");
    fireEvent.click(options[qi]);
  });
  fireEvent.click(screen.getByText("صحّح إجاباتي"));
  expect(screen.getByText("من ٥")).toBeInTheDocument();
  expect(onFirstCorrectSubmit).toHaveBeenCalledTimes(1);
});

test("retrying clears answers without re-fetching (no fetch calls at all)", () => {
  global.fetch = jest.fn();
  render(<Quiz questions={questions} onFirstCorrectSubmit={() => {}} />);
  questions.forEach((_, qi) => fireEvent.click(screen.getAllByText("أ")[qi]));
  fireEvent.click(screen.getByText("صحّح إجاباتي"));
  fireEvent.click(screen.getByText("إعادة الاختبار"));
  expect(screen.getByText("صحّح إجاباتي")).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
  delete global.fetch;
});
