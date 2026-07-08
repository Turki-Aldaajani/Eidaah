import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

test("renders the fixed prototype notice and links to /about and /faq", () => {
  renderFooter();
  expect(screen.getByText(/فريق الذكاء الاصطناعي بنادي إنجاز/)).toBeInTheDocument();
  expect(screen.getByText(/نموذج أولي، جميع البيانات تجريبية/)).toBeInTheDocument();
  expect(screen.getByText("عن الفريق").closest("a")).toHaveAttribute("href", "/about");
  expect(screen.getByText("الأسئلة الشائعة").closest("a")).toHaveAttribute("href", "/faq");
});
