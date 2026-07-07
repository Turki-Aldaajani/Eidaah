import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

function renderFooter(language) {
  return render(
    <MemoryRouter>
      <Footer language={language} />
    </MemoryRouter>
  );
}

test("renders the Arabic team message and links to /about and /faq", () => {
  renderFooter("ar");
  expect(screen.getByText(/فريق الذكاء الاصطناعي بنادي إنجاز/)).toBeInTheDocument();
  expect(screen.getByText("عن الفريق").closest("a")).toHaveAttribute("href", "/about");
  expect(screen.getByText("أسئلة شائعة").closest("a")).toHaveAttribute("href", "/faq");
});

test("renders the English team message when language is en", () => {
  renderFooter("en");
  expect(screen.getByText(/Enjaz Club - AI Team/)).toBeInTheDocument();
});
