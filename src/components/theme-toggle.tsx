"use client";

import { useEffect, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const options: ThemePreference[] = ["system", "light", "dark"];

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof document === "undefined") {
      return "system";
    }

    const current = document.documentElement.dataset.themePreference;
    if (current === "light" || current === "dark" || current === "system") {
      return current;
    }

    return "system";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(theme);
    document.documentElement.dataset.themePreference = theme;
    localStorage.setItem("hp3-theme", theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme !== "system") return;
      document.documentElement.dataset.theme = resolveTheme("system");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  function updateTheme(next: ThemePreference) {
    setTheme(next);
  }

  return (
    <div className="inline-flex rounded-full border border-[color:var(--border-strong)] bg-[var(--surface-muted)] p-1">
      {options.map((option) => {
        const active = theme === option;
        return (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            key={option}
            onClick={() => updateTheme(option)}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
