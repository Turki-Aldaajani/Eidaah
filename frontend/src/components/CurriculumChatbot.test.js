// اختبار مكوّن شات بوت المناهج C3 (#52) — تصيير + تفاعل.
import { render, screen, fireEvent } from "@testing-library/react";
import CurriculumChatbot from "./CurriculumChatbot";

// نعزل useNavigate لتأكيد التنقّل دون Router حقيقي
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => mockNavigate.mockClear());

function ask(text) {
  fireEvent.change(screen.getByLabelText("سؤالك"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "أرسل" }));
}

test("يعرض حقل الإدخال وزر الإرسال والعنوان الرئيسي (بلا رسالة مكررة)", () => {
  const { container } = render(<CurriculumChatbot />);
  expect(screen.getByLabelText("سؤالك")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "أرسل" })).toBeInTheDocument();
  expect(screen.getByText(/اكتب اسم درس/)).toBeInTheDocument();
  // لا سجل محادثة (ولا رسالة ترحيب مكررة) قبل أول سؤال
  expect(container.querySelector(".cbot-log")).toBeNull();
});

test("حقل الإدخال قابل للكتابة", () => {
  render(<CurriculumChatbot />);
  const input = screen.getByLabelText("سؤالك");
  fireEvent.change(input, { target: { value: "الأعداد النسبية" } });
  expect(input.value).toBe("الأعداد النسبية");
});

test("الحالة 1: سؤال يحدّد الصف → تنقّل مباشر لصفحة الدرس", () => {
  render(<CurriculumChatbot />);
  ask("أريد درس الأعداد النسبية أول متوسط");
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith("/learn/m1/math/1/0");
});

test("درس مكرر عبر الصفوف → خيارات الصفوف بلا تنقّل تلقائي", () => {
  render(<CurriculumChatbot />);
  ask("أريد درس الأعداد النسبية");
  // لا توجيه عشوائي لصف
  expect(mockNavigate).not.toHaveBeenCalled();
  const opts = screen
    .getAllByRole("button")
    .filter((b) => b.className.includes("chat-option"));
  expect(opts.length).toBeGreaterThan(1);
  expect(opts.length).toBeLessThanOrEqual(4);
  // كل خيار يذكر صفه
  expect(screen.getByText(/الأول المتوسط/)).toBeInTheDocument();
  // النقر على خيار ينقل لصفحته
  fireEvent.click(opts[0]);
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate.mock.calls[0][0]).toMatch(/^\/learn\/m[123]\/math\/1\/0$/);
});

test("الحالة 2: سؤال غامض → أزرار خيارات (≤4) بلا تنقّل تلقائي", () => {
  render(<CurriculumChatbot />);
  ask("أريد درس رياضيات");
  // لم يحدث تنقّل تلقائي
  expect(mockNavigate).not.toHaveBeenCalled();
  // خيار معروف ظاهر كزر
  const opt = screen.getByRole("button", { name: /الأعداد النسبية/ });
  expect(opt).toBeInTheDocument();
  // تلميح "وضّح أكثر"
  expect(screen.getByText(/وضّح أكثر/)).toBeInTheDocument();
  // النقر على خيار ينقل لصفحته
  fireEvent.click(opt);
  expect(mockNavigate).toHaveBeenCalledWith("/learn/m1/math/1/0");
});

test("عدد الخيارات لا يتجاوز 4", () => {
  render(<CurriculumChatbot />);
  ask("أريد درس رياضيات");
  const optionButtons = screen
    .getAllByRole("button")
    .filter((b) => b.className.includes("chat-option"));
  expect(optionButtons.length).toBeGreaterThan(1);
  expect(optionButtons.length).toBeLessThanOrEqual(4);
});

test("الحالة 3: خارج النطاق → رد لطيف بلا تنقّل وبلا كسر", () => {
  render(<CurriculumChatbot />);
  ask("فيزياء نووية");
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByText(/المواد المتوفرة|عذرا|لم أجد/)).toBeInTheDocument();
});

test("إرسال فارغ لا يفعل شيئاً", () => {
  const { container } = render(<CurriculumChatbot />);
  fireEvent.click(screen.getByRole("button", { name: "أرسل" }));
  expect(mockNavigate).not.toHaveBeenCalled();
  // لا رسالة مستخدم أُضيفت
  expect(container.querySelectorAll(".chat-user")).toHaveLength(0);
});

test("يحترم المرحلة الممرّرة عبر الخصائص", () => {
  render(<CurriculumChatbot stageId="m3" />);
  ask("أريد درس الأعداد النسبية");
  expect(mockNavigate).toHaveBeenCalledWith("/learn/m3/math/1/0");
});
