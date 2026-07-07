import { render, screen, fireEvent } from "@testing-library/react";
import VideoGrid from "./VideoGrid";
import { mockVideos, lessonsFor } from "../../data/curriculum";

function sampleVideos() {
  return mockVideos(lessonsFor("math")[0], "math");
}

test("renders one card per video and a result count", () => {
  render(<VideoGrid videos={sampleVideos()} subjectIcon="calculator" onWatch={() => {}} />);
  expect(screen.getByText(/عرض ٨ من ٨ شرحاً مقترحاً/)).toBeInTheDocument();
});

test("filtering by nationality narrows the visible cards and updates the count", () => {
  render(<VideoGrid videos={sampleVideos()} subjectIcon="calculator" onWatch={() => {}} />);
  fireEvent.change(screen.getByLabelText("جنسية الشارح"), { target: { value: "sa" } });
  expect(screen.getByText(/عرض ٤ من ٨ شرحاً مقترحاً/)).toBeInTheDocument();
});

test("resetting filters restores every card", () => {
  render(<VideoGrid videos={sampleVideos()} subjectIcon="calculator" onWatch={() => {}} />);
  fireEvent.change(screen.getByLabelText("جنسية الشارح"), { target: { value: "sa" } });
  fireEvent.click(screen.getByText("إعادة تعيين"));
  expect(screen.getByText(/عرض ٨ من ٨ شرحاً مقترحاً/)).toBeInTheDocument();
});

test("clicking a video's watch button calls onWatch with that video", () => {
  const handleWatch = jest.fn();
  render(<VideoGrid videos={sampleVideos()} subjectIcon="calculator" onWatch={handleWatch} />);
  fireEvent.click(screen.getAllByText("مشاهدة")[0]);
  expect(handleWatch).toHaveBeenCalledTimes(1);
  expect(handleWatch.mock.calls[0][0]).toHaveProperty("title");
});
