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
  // Footer also renders its own hardcoded "إيضاح" logo text, so scope this
  // assertion to the TopNav brand mark specifically to avoid an ambiguous match.
  expect(document.querySelector(".topnav .brand-txt b")).toHaveTextContent("إيضاح");
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

test("a failed upload shows the error message instead of navigating", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  renderUpload();

  const file = new File(["dummy"], "deck.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(screen.getByText("حدث خطأ في رفع الملف")).toBeInTheDocument());
});
