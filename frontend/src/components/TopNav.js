import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { useTheme } from "../theme/ThemeContext";

export default function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="topnav">
      <div className="container nav-in">
        <Link className="brand" to="/">
          <span className="brand-mark">إ</span>
          <span className="brand-txt">
            <b>إيضاح</b>
            <i>نادي إنجاز · جامعة الإمام</i>
          </span>
        </Link>
        <div className="nav-side">
          <span className="proto-chip">نموذج أولي</span>
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
