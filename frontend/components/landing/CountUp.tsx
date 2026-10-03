"use client";

import { useEffect, useRef, useState } from "react";

const ease = (t: number) => 1 - Math.pow(1 - t, 4);

/** Counts a number up the first time it scrolls into view. Reduced motion shows the number straight away. */
export function CountUp({ value, format, duration = 1400, className }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        watcher.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setShown(value * ease(t));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(shown ?? 0)}
    </span>
  );
}
