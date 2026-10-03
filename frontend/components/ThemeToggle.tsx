"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

/** Reads the theme the inline script in the root layout already applied, so the button never disagrees with the page. */
function current(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Switches the whole site between the dark canvas and the light one. The choice is remembered. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(current()), []);

  function flip() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("ll-theme", next);
    } catch {
      // A blocked storage means the choice lasts for this page only, which is fine.
    }
    setTheme(next);
  }

  const light = theme === "light";
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      title={light ? "Dark" : "Light"}
      className={`flex size-10 items-center justify-center rounded-full border border-line text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink ${className}`}
    >
      {theme === null ? (
        <span className="size-4" aria-hidden />
      ) : light ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </button>
  );
}
