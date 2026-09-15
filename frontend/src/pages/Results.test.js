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

const ok = (data) => Promise.resolve({ ok: true, status: 200, json: async () => data });
const callsTo = (fetchMock, path) => fetchMock.mock.calls.filter(([url]) => String(url).includes(path));
const bodyOf = (call) => JSON.parse(call[1].body);

// مواضيع بلا شرائح (الشكل القديم) — تُبقي اختبارات التدفق الأساسية كما هي
const legacyTopics = [{ topic_id: 0, label: "موضوع النظم" }];
// #109: مواضيع مربوطة بشرائحها كما يرجعها detect_topics الآن
const mappedTopics = [
  { topic_id: 0, label: "المقدمة", slides: [1, 2] },
  { topic_id: 1, label: "التطبيقات", slides: [3] },
];

// محتوى يختلف لكل شريحة — ليكشف أي بقاء على محتوى الشريحة/الموضوع الأول
function slideLearning(body) {
  const n = body.slide_number;
  return ok({
    slide_number: n, topic_id: body.topic_id, used_visual: false,
    context_slides: n > 1 ? [n - 1, n] : [n],
    explanation: n === 1 ? "شرح تحليلي مفصّل للموضوع." : `شرح تحليلي للشريحة رقم ${n}.`,
    examples: [n === 1 ? "مثال واقعي على الموضوع" : `مثال واقعي للشريحة ${n}`],
    notes: [`ملاحظة مذاكرة للشريحة ${n}`],
  });
}

function routedFetch({ topics = legacyTopics, learning = slideLearning } = {}) {
  let generation = 0;
  return jest.fn((url, opts) => {
    const u = String(url);
    if (u.includes("/slide_learning")) {
      generation += 1;
      return learning(JSON.parse(opts.body), generation);
    }
    if (u.includes("/generate_questions")) {
      const n = JSON.parse(opts.body).slide_number;
      return ok({ questions: [{ q: n === 1 ? "ما وظيفة النظام؟" : `سؤال عن الشريحة ${n}؟`, o: ["أ", "ب", "ج"], a: 1, e: "لأنه ينظّم البيانات" }] });
    }
    if (u.includes("/summary")) {
      return ok({ summary: "ملخص العرض" });
    }
    return ok({ session_id: "sess-1", indexing_complete: true, slides: [], topics, summary: "" });
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
  // تظهر الأسئلة تلقائياً (فُتح المسار للشريحة المعروضة + تولّدت الأسئلة)
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

// ---------------------------------------------------------------------------
// #109 — المحتوى المولّد يتبع الشريحة/الموضوع الحالي ولا يبقى على الأول
// ---------------------------------------------------------------------------
describe("#109 generated content follows the current slide and topic", () => {
  const next = () => fireEvent.click(screen.getByRole("button", { name: /التالية/ }));

  test("navigating slides regenerates the explanation, example and notes for each slide", async () => {
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
    expect(await screen.findByText("شرح تحليلي مفصّل للموضوع.")).toBeInTheDocument();

    next();
    expect(await screen.findByText("شرح تحليلي للشريحة رقم 2.")).toBeInTheDocument();
    expect(screen.getByText("مثال واقعي للشريحة 2")).toBeInTheDocument();
    expect(screen.getByText("ملاحظة مذاكرة للشريحة 2")).toBeInTheDocument();
    expect(screen.queryByText("شرح تحليلي مفصّل للموضوع.")).not.toBeInTheDocument();

    next();
    expect(await screen.findByText("شرح تحليلي للشريحة رقم 3.")).toBeInTheDocument();
    expect(callsTo(global.fetch, "/slide_learning").map((c) => bodyOf(c).slide_number)).toEqual([1, 2, 3]);
  });

  test("returning to a slide reuses its generated content instead of regenerating", async () => {
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
    await screen.findByText("شرح تحليلي مفصّل للموضوع.");
    next();
    await screen.findByText("شرح تحليلي للشريحة رقم 2.");

    fireEvent.click(screen.getByRole("button", { name: /السابقة/ }));
    expect(await screen.findByText("شرح تحليلي مفصّل للموضوع.")).toBeInTheDocument();
    expect(callsTo(global.fetch, "/slide_learning")).toHaveLength(2);
  });

  test("shows which slides the explanation was built from", async () => {
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
    await screen.findByText("شرح تحليلي مفصّل للموضوع.");
    next();
    expect(await screen.findByText("مبني على الشرائح ١–٢")).toBeInTheDocument();
  });

  test("the regenerate button asks for a fresh explanation of the current slide", async () => {
    global.fetch = routedFetch({
      learning: (body, generation) => ok({
        slide_number: body.slide_number, topic_id: body.topic_id, context_slides: [body.slide_number], used_visual: false,
        explanation: generation === 1 ? "الشرح الأول للشريحة." : "شرح جديد بعد إعادة التوليد.",
        examples: [], notes: ["ملاحظة ثابتة للمذاكرة"],
      }),
    });
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
    await screen.findByText("الشرح الأول للشريحة.");

    fireEvent.click(screen.getByRole("button", { name: /إعادة توليد الشرح/ }));
    expect(await screen.findByText("شرح جديد بعد إعادة التوليد.")).toBeInTheDocument();
    expect(bodyOf(callsTo(global.fetch, "/slide_learning")[1])).toMatchObject({ slide_number: 1, refresh: true });
  });

  test("a failed generation shows an error and a retry button instead of loading forever", async () => {
    global.fetch = routedFetch({
      learning: (body, generation) => (generation === 1
        ? Promise.resolve({ ok: false, status: 502, json: async () => ({ detail: "x" }) })
        : ok({
          slide_number: body.slide_number, topic_id: body.topic_id, context_slides: [body.slide_number], used_visual: false,
          explanation: "نجح التوليد بعد المحاولة.", examples: [], notes: ["ملاحظة ثابتة للمذاكرة"],
        })),
    });
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
    expect((await screen.findAllByText(/تعذّر توليد المحتوى/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));
    expect(await screen.findByText("نجح التوليد بعد المحاولة.")).toBeInTheDocument();
  });

  test("the quiz targets the current slide and never shows another slide's questions", async () => {
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح موضوع النظم" }));
    await screen.findByText("مثال واقعي على الموضوع");
    fireEvent.click(screen.getByRole("button", { name: /توليد أسئلة المراجعة/ }));
    expect(await screen.findByText(/ما وظيفة النظام؟/)).toBeInTheDocument();

    next();
    await screen.findByText("شرح تحليلي للشريحة رقم 2.");
    expect(screen.queryByText(/ما وظيفة النظام؟/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /توليد أسئلة المراجعة/ }));
    expect(await screen.findByText(/سؤال عن الشريحة 2؟/)).toBeInTheDocument();
    expect(callsTo(global.fetch, "/generate_questions").map((c) => bodyOf(c).slide_number)).toEqual([1, 2]);
  });

  test("explaining a topic jumps to its slides and generates for that topic", async () => {
    global.fetch = routedFetch({ topics: mappedTopics });
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح التطبيقات" }));

    expect(await screen.findByText(/الشريحة ٣ من ٣/)).toBeInTheDocument();
    expect(await screen.findByText("شرح تحليلي للشريحة رقم 3.")).toBeInTheDocument();
    expect(bodyOf(callsTo(global.fetch, "/slide_learning")[0])).toMatchObject({ slide_number: 3, topic_id: 1 });
  });

  test("moving into another topic's slides switches the topic automatically", async () => {
    global.fetch = routedFetch({ topics: mappedTopics });
    renderResults();
    fireEvent.click(await screen.findByRole("button", { name: "شرح المقدمة" }));
    await screen.findByText("شرح تحليلي مفصّل للموضوع.");

    next(); // الشريحة ٢ — ما زالت ضمن «المقدمة»
    await screen.findByText("شرح تحليلي للشريحة رقم 2.");
    next(); // الشريحة ٣ — موضوع «التطبيقات»
    await screen.findByText("شرح تحليلي للشريحة رقم 3.");

    expect(callsTo(global.fetch, "/slide_learning").map((c) => [bodyOf(c).slide_number, bodyOf(c).topic_id]))
      .toEqual([[1, 0], [2, 0], [3, 1]]);
    expect(screen.getByText("الموضوع: التطبيقات")).toBeInTheDocument();
  });

  test("opening the flow from the rail uses the displayed slide's topic, not the first topic", async () => {
    global.fetch = routedFetch({ topics: mappedTopics });
    renderResults();
    await screen.findByRole("button", { name: "شرح المقدمة" });
    next();
    next();

    fireEvent.click(screen.getByRole("button", { name: /شرح تحليلي/ }));
    expect(await screen.findByText("شرح تحليلي للشريحة رقم 3.")).toBeInTheDocument();
    expect(bodyOf(callsTo(global.fetch, "/slide_learning")[0])).toMatchObject({ slide_number: 3, topic_id: 1 });
  });
});
