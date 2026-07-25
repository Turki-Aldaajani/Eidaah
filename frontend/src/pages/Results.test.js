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

test("customize lets the student hide an optional stage (core stages locked)", () => {
  const { container } = renderResults();
  expect(container.querySelectorAll(".an-stage-btn")).toHaveLength(7);

  fireEvent.click(screen.getByRole("button", { name: /تخصيص/ }));
  // المرحلة الأساسية معطّلة
  expect(screen.getByRole("checkbox", { name: /عرض الشريحة/ })).toBeDisabled();
  // إخفاء مرحلة اختيارية
  fireEvent.click(screen.getByRole("checkbox", { name: "ملخص الشريحة" }));
  expect(container.querySelectorAll(".an-stage-btn")).toHaveLength(6);
});

test("customize can reorder stages (moving a stage down updates the rail order)", () => {
  const { container } = renderResults();
  const railLabels = () => [...container.querySelectorAll(".an-rail-list .an-stage-label")].map((e) => e.textContent);
  expect(railLabels()[0]).toBe("عرض الشريحة");

  fireEvent.click(screen.getByRole("button", { name: /تخصيص/ }));
  // حرّك المرحلة الأولى (عرض الشريحة) لأسفل
  fireEvent.click(screen.getAllByRole("button", { name: "تحريك لأسفل" })[0]);
  expect(railLabels()[0]).toBe("ملخص الشريحة");
  expect(JSON.parse(localStorage.getItem("an_stage_order"))[0]).toBe(2);
});

test("shows a re-upload prompt when the session has expired (status 404)", async () => {
  global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false, json: async () => ({}) });
  renderResults();
  expect(await screen.findByText(/انتهت الجلسة/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "إعادة رفع الملف" })).toBeInTheDocument();
});

test("clicking the Quiz stage in the rail auto-opens the flow and generates questions", async () => {
  const { container } = renderResults();
  // انتظر تحميل المواضيع من /status
  await screen.findByRole("button", { name: "شرح موضوع النظم" });
  // اضغط مرحلة «أسئلة تفاعلية» في الشريط مباشرةً دون اختيار موضوع يدوياً
  fireEvent.click(screen.getByRole("button", { name: /أسئلة تفاعلية/ }));
  // تظهر الأسئلة تلقائياً (اختير أول موضوع + تولّدت الأسئلة)
  expect(await screen.findByText(/ما وظيفة النظام؟/)).toBeInTheDocument();
  // القسم السابع صار «نشطاً» (إبراز الكنترول سنتر)
  expect(container.querySelector('.an-stage[data-step="7"]').className).toMatch(/is-active/);
});

test("clicking a rail stage highlights its section as active", async () => {
  const { container } = renderResults();
  fireEvent.click(screen.getByRole("button", { name: /ملخص الشريحة/ }));
  expect(container.querySelector('.an-stage[data-step="2"]').className).toMatch(/is-active/);
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
