import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Results from "./Results";
import { ThemeProvider } from "../theme/ThemeContext";

const baseSlides = [
  { slide_number: 1, text: "عنوان الشريحة الأولى\nمحتوى الشريحة الأولى", explanation: null, example: null },
];

function renderResults() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Results />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("slides", JSON.stringify(baseSlides));
  localStorage.setItem("filename", "deck.pdf");
  localStorage.setItem("session_id", "sess-1");
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ session_id: "sess-1", indexing_complete: true, slides: [], topics: [], summary: "" }),
  });
});

afterEach(() => {
  delete global.fetch;
});

test("shows an empty-state message and a way back to the analyzer when there are no stored slides", () => {
  localStorage.clear();
  renderResults();
  expect(screen.getByText("لم يتم العثور على شرائح. يرجى رفع ملف أولاً.")).toBeInTheDocument();
});

test("the explanation card is the first result card in the DOM (renders on the right under dir=rtl)", async () => {
  const { container } = renderResults();
  await waitFor(() => expect(screen.getByText("شرح تحليلي:")).toBeInTheDocument());
  const cards = container.querySelectorAll(".result-card");
  expect(cards).toHaveLength(2);
  expect(cards[0].textContent).toContain("شرح تحليلي");
  expect(cards[1].querySelector(".result-select")).not.toBeNull();
});

test("clicking Explain fetches the slide analysis and renders it in the explanation card", async () => {
  global.fetch.mockImplementation((url) => {
    if (String(url).includes("/api/analyze_slide")) {
      return Promise.resolve({ ok: true, json: async () => ({ analysis: "شرح الذكاء الاصطناعي", examples: ["مثال واقعي"] }) });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ session_id: "sess-1", indexing_complete: true, slides: [], topics: [], summary: "" }),
    });
  });
  renderResults();
  fireEvent.click(screen.getByText("شرح"));
  await waitFor(() => expect(screen.getByText("شرح الذكاء الاصطناعي")).toBeInTheDocument());
  expect(screen.getByText("مثال واقعي")).toBeInTheDocument();
});
