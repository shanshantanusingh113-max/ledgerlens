"use client";

import { useEffect, useRef } from "react";

// The signature visual: thousands of small outlined triangles in a full chromatic spread,
// gathered into the shape of a brain, drifting on the black canvas.
const PALETTE: [string, number][] = [
  ["#8052ff", 34],
  ["#b28cff", 10],
  ["#ffb829", 14],
  ["#1fb89a", 11],
  ["#ff4fd8", 9],
  ["#5b8cff", 13],
  ["#e6dcff", 9],
];
const SPREAD = PALETTE.flatMap((_, index) => Array<number>(PALETTE[index][1]).fill(index));
const COLOURS = PALETTE.map(([colour]) => colour);

// Two lobes, a middle and a lower bulge: the outline is this union, not a drawn shape.
const LOBES: [number, number, number, number, number][] = [
  [-0.33, -0.12, 0.47, 0.52, -0.22],
  [0.33, -0.12, 0.47, 0.52, 0.22],
  [0.0, 0.3, 0.63, 0.36, 0],
  [-0.02, 0.62, 0.28, 0.2, 0],
  [-0.04, 0.78, 0.11, 0.17, 0],
];

function inside(x: number, y: number): boolean {
  for (const [cx, cy, rx, ry, tilt] of LOBES) {
    const dx = x - cx;
    const dy = y - cy;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const u = (dx * c + dy * s) / rx;
    const v = (-dx * s + dy * c) / ry;
    if (u * u + v * v <= 1) return true;
  }
  return false;
}

type Point = { x: number; y: number; amp: number; speed: number; phase: number; spin: number; size: number; colour: number; glow: number };

/** Rejection samples the brain outline, then thins the middle so the two hemispheres read apart. */
function cloud(count: number): Point[] {
  const points: Point[] = [];
  let guard = count * 60;
  while (points.length < count && guard-- > 0) {
    const x = (Math.random() * 2 - 1) * 1.02;
    const y = (Math.random() * 2 - 1) * 1.02;
    if (!inside(x, y)) continue;
    // The fissure: fewer points on the midline in the upper half.
    const fissure = Math.abs(x) < 0.05 && y < 0.12 ? 0.25 : 1;
    if (Math.random() > fissure) continue;
    points.push({
      x,
      y,
      amp: 0.006 + Math.random() * 0.022,
      speed: 0.18 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() * 2 - 1) * 0.6,
      size: 1.6 + Math.random() * 3.4,
      colour: SPREAD[(Math.random() * SPREAD.length) | 0],
      glow: Math.random(),
    });
  }
  return points;
}

export function ParticleField({ className = "", density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let brain: Point[] = [];
    let drift: Point[] = [];
    let frame = 0;
    let running = false;

    function size() {
      const box = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = box.width;
      height = box.height;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = width * height;
      const count = Math.round(Math.min(1700, Math.max(420, area / 210)) * density);
      brain = cloud(count);
      drift = cloud(Math.round(count * 0.06)).map((p) => ({ ...p, x: (Math.random() * 2 - 1) * 1.45, y: (Math.random() * 2 - 1) * 1.3, amp: 0.02 + Math.random() * 0.05, size: 1.2 + Math.random() * 2.2 }));
      paint(0);
    }

    function triangle(x: number, y: number, s: number, rot: number) {
      const c = Math.cos(rot);
      const n = Math.sin(rot);
      const ax = 0.87 * s;
      const ay = 0.5 * s;
      ctx!.moveTo(x + s * n, y - s * c);
      ctx!.lineTo(x + ax * c - ay * n, y + ax * n + ay * c);
      ctx!.lineTo(x - ax * c - ay * n, y - ax * n + ay * c);
      ctx!.closePath();
    }

    function paint(t: number) {
      ctx!.clearRect(0, 0, width, height);
      const unit = Math.min(width, height) / 2.35;
      const cx = width / 2;
      const cy = height / 2;

      // One path per colour and per brightness step, so a frame is a handful of strokes.
      const buckets = COLOURS.map(() => [[], [], []] as Point[][]);
      const add = (p: Point, px: number, py: number, lit: number) => {
        const level = lit > 0.66 ? 0 : lit > 0.33 ? 1 : 2;
        buckets[p.colour][level].push({ ...p, x: px, y: py });
      };

      for (const p of drift) {
        const x = cx + p.x * unit + Math.sin(t * p.speed + p.phase) * p.amp * unit;
        const y = cy + p.y * unit + Math.cos(t * p.speed * 0.7 + p.phase) * p.amp * unit;
        add(p, x, y, 0.35 + 0.3 * Math.sin(t * 0.9 + p.phase));
      }
      for (const p of brain) {
        const x = cx + p.x * unit + Math.sin(t * p.speed + p.phase) * p.amp * unit;
        const y = cy + p.y * unit + Math.cos(t * p.speed * 0.83 + p.phase * 1.7) * p.amp * unit;
        add(p, x, y, 0.42 + 0.58 * Math.sin(t * p.speed * 2.4 + p.phase * 3));
      }

      ctx!.lineWidth = 1.15;
      for (let c = 0; c < COLOURS.length; c++) {
        for (let level = 0; level < 3; level++) {
          const group = buckets[c][level];
          if (!group.length) continue;
          ctx!.beginPath();
          for (const p of group) triangle(p.x, p.y, p.size, t * p.spin + p.phase);
          ctx!.strokeStyle = COLOURS[c];
          ctx!.globalAlpha = [0.95, 0.6, 0.34][level];
          ctx!.stroke();
        }
      }
      ctx!.globalAlpha = 1;
    }

    function loop(now: number) {
      if (!running) return;
      paint(now / 1000);
      frame = requestAnimationFrame(loop);
    }

    function play() {
      if (still || running) return;
      running = true;
      frame = requestAnimationFrame(loop);
    }
    function halt() {
      running = false;
      cancelAnimationFrame(frame);
    }

    size();
    const watcher = new ResizeObserver(size);
    watcher.observe(canvas);
    // No point drawing a field nobody can see, and none at all when the tab is in the background.
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : halt()), { threshold: 0 });
    seen.observe(canvas);
    const tab = () => {
      if (document.hidden) halt();
      else play();
    };
    document.addEventListener("visibilitychange", tab);

    return () => {
      watcher.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", tab);
      halt();
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
