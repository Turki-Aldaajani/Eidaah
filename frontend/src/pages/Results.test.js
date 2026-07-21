import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Results from "./Results";
import { ThemeProvider } from "../theme/ThemeContext";
import { LanguageProvider } from "../i18n/LanguageContext";

const baseSlides = [
  { slide_number: 1, text: "عنوان الشريحة الأولى\nمحتوى الشريحة الأولى", explanation: null, example: null },
];

function renderResults() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LanguageProvider>
          <Results />
        </LanguageProvider>
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

// A4 (#25): auto-generated title + description at the top of the results page.
test("renders the auto-generated title, description and AI badge from /status", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      session_id: "sess-1",
      indexing_complete: true,
      slides: [],
      topics: [],
      summary: "",
      title: "شرح الأعداد النسبية",
      description: "درس يوضّح مفهوم الأعداد النسبية.",
      auto_generated: true,
    }),
  });
  renderResults();
  expect(await screen.findByText("شرح الأعداد النسبية")).toBeInTheDocument();
  expect(screen.getByText("درس يوضّح مفهوم الأعداد النسبية.")).toBeInTheDocument();
  expect(screen.getByText(/بالذكاء الاصطناعي/)).toBeInTheDocument();
});

test("shows a filename-fallback title with NO AI badge when metadata was not generated", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      session_id: "sess-1",
      indexing_complete: true,
      slides: [],
      topics: [],
      summary: "",
      title: "deck",
      description: "",
      auto_generated: false,
    }),
  });
  renderResults();
  expect(await screen.findByText("deck")).toBeInTheDocument();
  expect(screen.queryByText(/بالذكاء الاصطناعي/)).toBeNull();
});
