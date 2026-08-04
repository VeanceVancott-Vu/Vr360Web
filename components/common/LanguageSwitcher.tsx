"use client";

import { useEffect } from "react";

import type { Language } from "@/lib/types";

interface LanguageSwitcherProps {
  language: Language;
  onChange: (language: Language) => void;
  label?: string;
}

export function LanguageSwitcher({
  language,
  onChange,
  label = "Language / Ngôn ngữ",
}: LanguageSwitcherProps) {
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("dn360-language", language);
  }, [language]);

  return (
    <div className="language-switcher" aria-label={label} role="group">
      {(["vi", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          lang={item}
          title={item === "vi" ? "Đổi sang Tiếng Việt" : "Switch to English"}
          aria-label={item === "vi" ? "Tiếng Việt" : "English"}
          data-tooltip={item === "vi" ? "Tiếng Việt" : "English"}
          aria-pressed={language === item}
          onClick={() => onChange(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
