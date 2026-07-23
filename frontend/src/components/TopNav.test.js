import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopNav from "./TopNav";
import { ThemeProvider } from "../theme/ThemeContext";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
const { useAuth } = require("../auth/AuthContext");
const { ADMIN_EMAILS } = require("../data/admins");

function renderTopNav() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <TopNav />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  useAuth.mockReturnValue({ session: null, account: null });
});

test("renders the brand name", () => {
  renderTopNav();
  expect(screen.getByText("إيضاح")).toBeInTheDocument();
});

test("clicking the theme toggle switches the document theme", () => {
  renderTopNav();
  const toggleBtn = screen.getByRole("button", { name: "تبديل الوضع الليلي" });
  expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  fireEvent.click(toggleBtn);
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  fireEvent.click(toggleBtn);
  expect(document.documentElement.getAttribute("data-theme")).toBeNull();
});

test("رابط «المشرف» لا يظهر للزائر ولا لمستخدم عادي", () => {
  // زائر
  renderTopNav();
  expect(screen.queryByText("المشرف")).not.toBeInTheDocument();

  // مستخدم عادي (ليس أدمن)
  useAuth.mockReturnValue({ session: { user: { email: "student@gmail.com" } }, account: null });
  renderTopNav();
  expect(screen.queryByText("المشرف")).not.toBeInTheDocument();
});

test("رابط «المشرف» يظهر لحساب الأدمن فقط", () => {
  useAuth.mockReturnValue({ session: { user: { email: ADMIN_EMAILS[0] } }, account: null });
  renderTopNav();
  const adminLink = screen.getByText("المشرف").closest("a");
  expect(adminLink).toHaveAttribute("href", "/admin");
});
