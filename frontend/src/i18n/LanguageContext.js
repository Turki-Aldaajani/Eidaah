import React, { createContext, useContext, useEffect, useState } from "react";

// Single source of truth for the UI language ("ar" | "en").
// Kept in localStorage under "language" for backward compatibility with the
// value pages used to read directly before this context existed.
const STORAGE_KEY = "language";

const LanguageContext = createContext(null);

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "ar" ? saved : "ar";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const toggleLanguage = () =>
    setLanguage((l) => (l === "ar" ? "en" : "ar"));

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
