"use client";

import { useEffect, useRef } from "react";

// The signature visual: thousands of small outlined triangles in a full chromatic spread,
// gathered into a cube that turns slowly on the black canvas.
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

// Half the edge length. Kept so the farthest corner still lands inside the canvas at any angle.
const HALF = 0.66;
// Depth is mapped to brightness, so this is the half range the projection can reach.
const REACH = HALF * 1.45;

type Point = { x: number; y: number; z: number; amp: number; speed: number; phase: number; spin: number; size: number; colour: number };

/** A point on one of the six faces, from two coordinates in the range -1 to 1. */
function facePoint(face: number, u: number, v: number) {
  switch (face) {
    case 0:
      return { x: HALF, y: u * HALF, z: v * HALF };
    case 1:
      return { x: -HALF, y: u * HALF, z: v * HALF };
    case 2:
      return { x: u * HALF, y: HALF, z: v * HALF };
    case 3:
      return { x: u * HALF, y: -HALF, z: v * HALF };
    case 4:
      return { x: u * HALF, y: v * HALF, z: HALF };
    default:
      return { x: u * HALF, y: v * HALF, z: -HALF };
  }
}

/** Rejection samples the cube surface, accepting mostly near the edges so the wireframe reads. */
function sample(count: number): Point[] {
  const points: Point[] = [];
  let guard = count * 40;
  while (points.length < count && guard-- > 0) {
    const face = (Math.random() * 6) | 0;
    const u = Math.random() * 2 - 1;
    const v = Math.random() * 2 - 1;
    const edge = Math.max(Math.abs(u), Math.abs(v));
    if (Math.random() > 0.14 + 0.86 * edge * edge) continue;
    const at = facePoint(face, u, v);
    points.push({
      x: at.x,
      y: at.y,
      z: at.z,
      amp: 0.004 + Math.random() * 0.014,
      speed: 0.18 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() * 2 - 1) * 0.14,
      size: 1.5 + Math.random() * 3.2,
      colour: SPREAD[(Math.random() * SPREAD.length) | 0],
    });
  }
  return points;
}

/** Loose dust behind the cube, spread wider than the cube itself. */
function dust(count: number): Point[] {
  return Array.from({ length: count }, () => ({
    x: (Math.random() * 2 - 1) * 1.45,
    y: (Math.random() * 2 - 1) * 1.3,
    z: 0,
    amp: 0.02 + Math.random() * 0.05,
    speed: 0.18 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    spin: 0,
    size: 1.2 + Math.random() * 2.2,
    colour: SPREAD[(Math.random() * SPREAD.length) | 0],
  }));
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
    let cube: Point[] = [];
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
      cube = sample(count);
      drift = dust(Math.round(count * 0.06));
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
      const pitch = Math.sin(t * 0.17) * 0.38 - 0.12;
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      // One path per colour and per brightness step, so a frame is a handful of strokes.
      const buckets = COLOURS.map(() => [[], [], []] as Point[][]);
      const add = (p: Point, px: number, py: number, lit: number, s: number) => {
        const level = lit > 0.66 ? 0 : lit > 0.33 ? 1 : 2;
        buckets[p.colour][level].push({ ...p, x: px, y: py, size: s });
      };

      for (const p of drift) {
        const x = cx + p.x * unit + Math.sin(t * p.speed + p.phase) * p.amp * unit;
        const y = cy + p.y * unit + Math.cos(t * p.speed * 0.7 + p.phase) * p.amp * unit;
        add(p, x, y, 0.35 + 0.3 * Math.sin(t * 0.9 + p.phase), p.size);
      }

      for (const p of cube) {
        const yaw = t * 0.26 + 0.7 + p.spin;
        const c = Math.cos(yaw);
        const s = Math.sin(yaw);
        const rx = p.x * c - p.z * s;
        const rz = p.x * s + p.z * c;
        const ry = p.y * cp - rz * sp;
        // Positive when the point has turned towards the viewer, so it gets brighter and larger.
        const near = 0.5 + (0.5 * (p.y * sp + rz * cp)) / REACH;
        const wobble = p.amp * unit;
        const x = cx + rx * unit + Math.sin(t * p.speed + p.phase) * wobble;
        const y = cy + ry * unit + Math.cos(t * p.speed * 0.83 + p.phase * 1.7) * wobble;
        const shimmer = 0.14 * Math.sin(t * p.speed * 2.4 + p.phase * 3);
        add(p, x, y, 0.2 + 0.72 * near + shimmer, p.size * (0.7 + 0.5 * near));
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