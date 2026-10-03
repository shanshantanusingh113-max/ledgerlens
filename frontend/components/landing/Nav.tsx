"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";

const LINKS: [string, string][] = [
  ["#problem", "The problem"],
  ["#how", "How it works"],
  ["#fix", "Try a fix"],
  ["#ring", "Supplier rings"],
  ["#proof", "Proof"],
  ["#data", "The data"],
];

/** The brand mark: the same angular fragment as the particles in the hero field. */
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="ll-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8052ff" />
          <stop offset="1" stopColor="#15846e" />
        </linearGradient>
      </defs>
      <path d="M16 3 L29 27 H3 Z" fill="none" stroke="url(#ll-mark)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16 12 L22 24 H10 Z" fill="#8052ff" opacity="0.85" />
    </svg>
  );
}

export function ScrollProgress() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".progress");
    if (!bar) return;
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${height > 0 ? Math.min(1, window.scrollY / height) : 0})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return <div className="progress" aria-hidden />;
}

export function Nav() {
  const [lifted, setLifted] = useState(false);
  const [here, setHere] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map(([id]) => document.querySelector(id)).filter((node): node is Element => !!node);
    const watcher = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setHere(`#${visible.target.id}`);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.6] },
    );
    for (const section of sections) watcher.observe(section);
    return () => watcher.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${lifted ? "border-b border-line bg-app-bg" : "border-b border-transparent"}`}
    >
      <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-10 py-5">
        <a href="#top" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[16px] tracking-[-0.01em]">LedgerLens</span>
        </a>

        <nav aria-label="Page" className="ml-auto hidden items-center gap-7 lg:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className={`label link-underline ${here === href ? "text-ink" : "text-ink-3 hover:text-ink"}`}>
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-10 items-center justify-center rounded-full border border-line text-ink-2 transition-colors hover:border-ink hover:text-ink lg:hidden"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Page" className="border-t border-line bg-app-bg px-10 py-6 lg:hidden">
          <ul className="grid gap-4">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <a href={href} onClick={() => setOpen(false)} className="label text-ink-2 hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
