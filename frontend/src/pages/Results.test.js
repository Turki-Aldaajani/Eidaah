// اختبارات صفحة نتائج التحليل — تصميم مراحل التعلم (٧ مراحل + شريط + تنقّل سفلي)
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Results from "./Results";
import { ThemeProvider } from "../theme/ThemeContext";
import { LanguageProvider } from "../i18n/LanguageContext";

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

const slides3 = [
  { slide_number: 1, text: "الشريحة الأولى\nمحتوى أول" },
  { slide_number: 2, text: "الشريحة الثانية\nمحتوى ثانٍ" },
  { slide_number: 3, text: "الشريحة الثالثة\nمحتوى ثالث" },
];

function routedFetch() {
  return jest.fn((url) => {
    const u = String(url);
    if (u.includes("/analyze_topic")) {
      return Promise.resolve({ ok: true, json: async () => ({ topic_label: "موضوع النظم", explanation: "شرح تحليلي مفصّل للموضوع.", examples: ["مثال واقعي على الموضوع"] }) });
    }
    if (u.includes("/generate_questions")) {
      return Promise.resolve({ ok: true, json: async () => ({ questions: [{ q: "ما وظيفة النظام؟", o: ["أ", "ب", "ج"], a: 1, e: "لأنه ينظّم البيانات" }] }) });
    }
    if (u.includes("/summary")) {
      return Promise.resolve({ ok: true, json: async () => ({ summary: "ملخص العرض" }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ session_id: "sess-1", indexing_complete: true, slides: [], topics: [{ topic_id: 0, label: "موضوع النظم" }], summary: "" }) });
  });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("slides", JSON.stringify(slides3));
  localStorage.setItem("filename", "deck.pdf");
  localStorage.setItem("session_id", "sess-1");
  global.fetch = routedFetch();
});

afterEach(() => {
  delete global.fetch;
});

test("empty state when there are no stored slides", () => {
  localStorage.clear();
  renderResults();
  expect(screen.getByText("لم يتم العثور على شرائح. يرجى رفع ملف أولاً.")).toBeInTheDocument();
});

test("renders the 7-stage learning rail and the first slide", () => {
  const { container } = renderResults();
  expect(container.querySelectorAll(".an-stage-btn")).toHaveLength(7);
  expect(screen.getByText("الشريحة الأولى")).toBeInTheDocument();
});

test("bottom navigation shows a counter and moves between slides", () => {
  const { container } = renderResults();
  expect(container.querySelector(".an-bottom-count").textContent).toMatch(/١ من ٣/);

  const prev = screen.getByRole("button", { name: /السابقة/ });
  const next = screen.getByRole("button", { name: /التالية/ });
  expect(prev).toBeDisabled();

  fireEvent.click(next);
  expect(container.querySelector(".an-bottom-count").textContent).toMatch(/٢ من ٣/);
  expect(prev).not.toBeDisabled();
});

test("shows the auto-generated title, description and AI badge from /status", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ session_id: "sess-1", indexing_complete: true, slides: [], topics: [], summary: "", title: "شرح الأعداد النسبية", description: "درس يوضّح الأعداد النسبية.", auto_generated: true }),
  });
  renderResults();
  expect((await screen.findAllByText("شرح الأعداد النسبية")).length).toBeGreaterThan(0);
  expect(screen.getByText("درس يوضّح الأعداد النسبية.")).toBeInTheDocument();
  expect(screen.getByText(/بالذكاء الاصطناعي/)).toBeInTheDocument();
});

test("selecting a topic reveals the analytical explanation and example (real backend)", async () => {
  renderResults();
  fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
  expect((await screen.findAllByText("شرح تحليلي مفصّل للموضوع.")).length).toBeGreaterThan(0);
  expect(screen.getByText("مثال واقعي على الموضوع")).toBeInTheDocument();
});

test("generating the quiz shows questions and grades an answer", async () => {
  renderResults();
  fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
  await screen.findByText("مثال واقعي على الموضوع"); // إشارة جاهزية الموضوع

  fireEvent.click(screen.getByRole("button", { name: /توليد أسئلة المراجعة/ }));
  expect(await screen.findByText(/ما وظيفة النظام؟/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "ب" })); // الخيار الصحيح (a=1)
  expect(await screen.findByText(/إجابة صحيحة/)).toBeInTheDocument();
});
