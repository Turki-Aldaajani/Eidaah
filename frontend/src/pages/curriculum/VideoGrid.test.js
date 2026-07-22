import { render, screen, fireEvent } from "@testing-library/react";
import VideoGrid from "./VideoGrid";

// Real-API-shaped sample data (post-adaptApiVideos) — no "nat" field, since the
// real backend has no nationality data for a channel.
function sampleVideos() {
  const base = {
    match: { t: "ممتاز", cls: "m-a" },
    reason: "من قناة معتمدة",
    g: ["#155043", "#0F3E34"],
    icn: "calculator",
  };
  return [
    { ...base, video_id: "v1", title: "شرح ١", ch: "قناة أ", init: "أ", ver: true, durM: 4, dur: "٠٤:٠٠", views: 1200000, viewsT: "١٬٢٠٠", year: 2026, rate: 4.8 },
    { ...base, video_id: "v2", title: "شرح ٢", ch: "قناة ب", init: "ب", ver: false, durM: 6, dur: "٠٦:٠٠", views: 856000, viewsT: "٨٥٦", year: 2025, rate: 4.7 },
    { ...base, video_id: "v3", title: "شرح ٣", ch: "قناة ج", init: "ج", ver: true, durM: 8, dur: "٠٨:٠٠", views: 430000, viewsT: "٤٣٠", year: 2025, rate: 4.5 },
    { ...base, video_id: "v4", title: "شرح ٤", ch: "قناة د", init: "د", ver: false, durM: 9, dur: "٠٩:٠٠", views: 2100000, viewsT: "٢٬١٠٠", year: 2024, rate: 4.9 },
    { ...base, video_id: "v5", title: "شرح ٥", ch: "قناة هـ", init: "هـ", ver: true, durM: 14, dur: "١٤:٠٠", views: 98000, viewsT: "٩٨", year: 2023, rate: 4.2 },
    { ...base, video_id: "v6", title: "شرح ٦", ch: "قناة و", init: "و", ver: false, durM: 23, dur: "٢٣:٠٠", views: 610000, viewsT: "٦١٠", year: 2026, rate: 4.6 },
    { ...base, video_id: "v7", title: "شرح ٧", ch: "قناة ز", init: "ز", ver: true, durM: 36, dur: "٣٦:٠٠", views: 320000, viewsT: "٣٢٠", year: 2026, rate: 4.4 },
    { ...base, video_id: "v8", title: "شرح ٨", ch: "قناة ح", init: "ح", ver: false, durM: 47, dur: "٤٧:٠٠", views: 1500000, viewsT: "١٬٥٠٠", year: 2024, rate: 4.8 },
  ];
}

test("renders one card per video and a result count", () => {
  render(<VideoGrid videos={sampleVideos()} onWatch={() => {}} />);
  expect(screen.getByText(/عرض ٨ من ٨ شرحاً مقترحاً/)).toBeInTheDocument();
});

test("filtering by duration narrows the visible cards and updates the count", () => {
  render(<VideoGrid videos={sampleVideos()} onWatch={() => {}} />);
  fireEvent.change(screen.getByLabelText("مدة الشرح"), { target: { value: "lt10" } });
  expect(screen.getByText(/عرض ٤ من ٨ شرحاً مقترحاً/)).toBeInTheDocument();
});

test("resetting filters restores every card", () => {
  render(<VideoGrid videos={sampleVideos()} onWatch={() => {}} />);
  fireEvent.change(screen.getByLabelText("مدة الشرح"), { target: { value: "lt10" } });
  fireEvent.click(screen.getByText("إعادة تعيين"));
  expect(screen.getByText(/عرض ٨ من ٨ شرحاً مقترحاً/)).toBeInTheDocument();
});

test("clicking a video's watch button calls onWatch with that video", () => {
  const handleWatch = jest.fn();
  render(<VideoGrid videos={sampleVideos()} onWatch={handleWatch} />);
  fireEvent.click(screen.getAllByText("مشاهدة")[0]);
  expect(handleWatch).toHaveBeenCalledTimes(1);
  expect(handleWatch.mock.calls[0][0]).toHaveProperty("title");
});

test("nationality filter no longer exists (real data has none)", () => {
  render(<VideoGrid videos={sampleVideos()} onWatch={() => {}} />);
  expect(screen.queryByLabelText("جنسية الشارح")).not.toBeInTheDocument();
});
