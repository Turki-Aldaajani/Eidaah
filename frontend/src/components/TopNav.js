import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../auth/AuthContext";
import { isAdminEmail } from "../data/admins";

export default function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const { session, account } = useAuth();
  const isDark = theme === "dark";
  const isAdmin = isAdminEmail(session?.user?.email);

  return (
    <header className="topnav">
      <div className="container nav-in">
        <Link className="brand" to="/">
          <span className="brand-mark">إ</span>
          <span className="brand-txt">
            <b>إيضاح</b>
            <i>مَن جَعَلَ الإيضَاحَ سِرَاجَه، نَال في الدَّرْبِ حَاجَه</i>
          </span>
        </Link>
        <div className="nav-side">
          <Link className="nav-auth" to="/library">
            <Icon name="book-open" />
            <span className="nav-auth-email">المكتبة</span>
          </Link>
          {session ? (
            <>
              <Link className="nav-auth" to="/moadi">
                <Icon name="book-open" />
                <span className="nav-auth-email">مقرراتي</span>
              </Link>
              <Link className="nav-auth" to="/submit-material">
                <Icon name="layers" />
                <span className="nav-auth-email">أضف مقرراً</span>
              </Link>
              {isAdmin && (
                <Link className="nav-auth" to="/admin">
                  <Icon name="shield" />
                  <span className="nav-auth-email">المشرف</span>
                </Link>
              )}
              <Link className="nav-auth signed" to="/login" title={session.user?.email}>
                <Icon name="mail" />
                <span className="nav-auth-email">{session.user?.email}</span>
                {account?.type === "university" && <span className="nav-auth-chip">جامعي</span>}
              </Link>
              <Link
                className="theme-toggle"
                to="/settings"
                aria-label="الإعدادات"
                title="الإعدادات"
              >
                <Icon name="settings" />
              </Link>
            </>
          ) : (
            <Link className="nav-auth" to="/login">
              <Icon name="mail" />
              <span>تسجيل الدخول</span>
            </Link>
          )}
          <button
            type="button"
            className="theme-toggle"
            aria-label="تبديل الوضع الليلي"
            title="تبديل الوضع الليلي"
            onClick={toggleTheme}
          >
            <Icon name={isDark ? "sun" : "moon"} />
          </button>
        </div>
      </div>
    </header>
  );
}
