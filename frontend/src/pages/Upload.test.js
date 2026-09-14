import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Upload from "./Upload";
import { ThemeProvider } from "../theme/ThemeContext";
import { LanguageProvider } from "../i18n/LanguageContext";

function renderUpload() {
  return render(
    <MemoryRouter initialEntries={["/analyze"]}>
      <ThemeProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/analyze" element={<Upload />} />
            <Route path="/analyze/results" element={<div>results page</div>} />
          </Routes>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
  jest.useRealTimers();
});

test("renders the drop zone and both entry points from TopNav", () => {
  renderUpload();
  expect(screen.getByText("ارفع ملف بصيغة PDF أو PPTX")).toBeInTheDocument();
  // TopNav's brand is now a theme-aware logo image (alt="إيضاح"); scope to the
  // topnav to avoid matching the Footer's own logo.
  expect(document.querySelector(".topnav .brand-logo")).toBeInTheDocument();
});

test("toggling language switches the headline to English and persists it", () => {
  renderUpload();
  fireEvent.click(screen.getByText("English"));
  expect(screen.getByText("Understand and Present Clearly")).toBeInTheDocument();
  expect(localStorage.getItem("language")).toBe("en");
});

test("a successful upload stores slides/filename/session_id and navigates to /analyze/results", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      session_id: "sess-1",
      filename: "deck.pdf",
      slides: [{ slide_number: 1, text: "hello" }],
    }),
  });
  jest.useFakeTimers({ advanceTimers: true });
  renderUpload();

  const file = new File(["dummy"], "deck.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(JSON.parse(localStorage.getItem("slides") || "[]")).toHaveLength(1));
  expect(localStorage.getItem("filename")).toBe("deck.pdf");
  expect(localStorage.getItem("session_id")).toBe("sess-1");
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/upload_file"),
    expect.objectContaining({ method: "POST" })
  );

  jest.advanceTimersByTime(600);
  await waitFor(() => expect(screen.getByText("results page")).toBeInTheDocument());
});

// ‏#105: الباك اند يولّد الملخص/الوصف التلقائي مباشرة بعد الرفع، فلا بد أن
// يحمل طلب الرفع نفسه لغة الواجهة — وإلا اختار النموذج اللغة من محتوى الملف.
async function uploadAndReadSentLanguage() {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ session_id: "sess-1", filename: "deck.pdf", slides: [] }),
  });
  const file = new File(["dummy"], "deck.pdf", { type: "application/pdf" });
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  return global.fetch.mock.calls[0][1].body.get("language");
}

test("الرفع يرسل العربية افتراضياً (#105)", async () => {
  renderUpload();
  expect(await uploadAndReadSentLanguage()).toBe("ar");
});

test("بعد التبديل للإنجليزية يرسل الرفع en (#105)", async () => {
  renderUpload();
  fireEvent.click(screen.getByText("English"));
  expect(await uploadAndReadSentLanguage()).toBe("en");
});

test("لغة محفوظة مسبقاً تُرسل من أول رفعة بلا تبديل يدوي (#105)", async () => {
  localStorage.setItem("language", "en");
  renderUpload();
  expect(await uploadAndReadSentLanguage()).toBe("en");
});

test("a failed upload shows the error message instead of navigating", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  renderUpload();

  const file = new File(["dummy"], "deck.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(screen.getByText("حدث خطأ في رفع الملف")).toBeInTheDocument());
});
