"use client";

import { useEffect, useRef, useState } from "react";

/** Adds is-in once the block scrolls into view, which is what starts the .reveal transition. */
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const watcher = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      watcher.disconnect();
      setSeen(true);
    }, { rootMargin, threshold: 0.1 });
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [rootMargin]);

  return { ref, seen };
}

/** A block that rises and fades in the first time it is seen. Pass delay to stagger a group. */
export function Reveal({ as: Tag = "div", delay = 0, className = "", children }: { as?: "div" | "section" | "li" | "p" | "h2"; delay?: number; className?: string; children: React.ReactNode }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  return (
    <Tag ref={ref as never} className={`reveal ${seen ? "is-in" : ""} ${className}`} style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}>
      {children}
    </Tag>
  );
}

/** The same, for one block that starts from behind the hero. */
export function useInViewOnce<T extends HTMLElement>() {
  return useInView<T>("200px");
}
