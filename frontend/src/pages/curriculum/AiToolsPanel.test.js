import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AiToolsPanel from "./AiToolsPanel";

const stage = { id: "m1", n: "الصف الأول المتوسط", lv: "middle" };
const subject = { n: "رياضيات", icn: "calculator", c: "#155043" };
const lesson = { t: "القوى والأسس", min: 25, diff: { t: "متوسط", cls: "d-mid" } };

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

test("clicking the summary card fetches /api/lesson_tool and renders the points", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tool: "sum", points: ["نقطة أولى", "نقطة ثانية"] }),
  });
  const onStepDone = jest.fn();
  render(<AiToolsPanel stage={stage} subject={subject} lesson={lesson} progress={{}} onStepDone={onStepDone} />);

  fireEvent.click(screen.getByText("تلخيص الدرس"));

  await waitFor(() => expect(screen.getByText("نقطة أولى")).toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/lesson_tool"),
    expect.objectContaining({ method: "POST" })
  );
  const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(requestBody).toEqual({ stage: "m1", subject: "رياضيات", lesson_title: "القوى والأسس", tool: "sum", language: "ar" });
  expect(onStepDone).toHaveBeenCalledWith("sum");
});

test("reopening a card already fetched does not call fetch again", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tool: "sum", points: ["نقطة أولى"] }),
  });
  render(<AiToolsPanel stage={stage} subject={subject} lesson={lesson} progress={{}} onStepDone={() => {}} />);

  const toggle = screen.getByText("تلخيص الدرس");
  fireEvent.click(toggle);
  await waitFor(() => expect(screen.getByText("نقطة أولى")).toBeInTheDocument());

  fireEvent.click(toggle); // close
  fireEvent.click(toggle); // reopen
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("shows an error message and does not mark the step done when the backend fails", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ detail: "تعذّر التوليد" }) });
  const onStepDone = jest.fn();
  render(<AiToolsPanel stage={stage} subject={subject} lesson={lesson} progress={{}} onStepDone={onStepDone} />);

  fireEvent.click(screen.getByText("شرح بمثال من الواقع"));
  await waitFor(() => expect(screen.getByText("تعذّر التوليد")).toBeInTheDocument());
  expect(onStepDone).not.toHaveBeenCalledWith("ex");
});
