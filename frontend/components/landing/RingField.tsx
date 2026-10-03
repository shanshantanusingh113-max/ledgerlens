"use client";

import { useEffect, useRef } from "react";

// The signature visual: the same graph as the Ring view, one Company in the middle with the
// Parties around it, and the round trip between two of them picked out in saffron.
const INK = "#f5f3f8";
const MUTED = "rgba(245, 243, 248, 0.34)";
const HAIRLINE = "rgba(245, 243, 248, 0.16)";
const IRIS = "#8052ff";
const SAFFRON = "#ffb829";
const RISK = "#ff5a52";

// Fixed so the graph is the same on every load. A small LCG, no dependency.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Node = { angle: number; radius: number; size: number; colour: string; risk: boolean; bob: number; phase: number };
type Edge = { from: number; to: number; round: boolean; offset: number; speed: number };

function build() {
  const rand = seeded(20251004);
  const COUNT = 15;
  const nodes: Node[] = [];
  // The ring: Parties spread round a circle, two of them pulled off to show the round trip.
  for (let i = 0; i < COUNT; i++) {
    const angle = (i / COUNT) * Math.PI * 2;
    const risk = i === 3 || i === 9;
    nodes.push({
      angle,
      radius: 0.8 + (rand() - 0.5) * 0.1,
      size: risk ? 7.5 : 4 + rand() * 2.5,
      colour: risk ? RISK : i % 3 === 0 ? IRIS : INK,
      risk,
      bob: 0.01 + rand() * 0.02,
      phase: rand() * Math.PI * 2,
    });
  }

  const edges: Edge[] = [];
  for (let i = 0; i < COUNT; i++) {
    // Trade hops: mostly to the next Party, sometimes skipping one.
    const step = rand() > 0.72 ? 2 : 1;
    edges.push({ from: i, to: (i + step) % COUNT, round: false, offset: (rand() - 0.5) * 0.3, speed: 0.1 + rand() * 0.14 });
  }
  // Every node also trades with the Company in the middle.
  for (let i = 0; i < COUNT; i++) {
    edges.push({ from: i, to: -1, round: false, offset: (rand() - 0.5) * 0.5, speed: 0.08 + rand() * 0.1 });
  }
  // The round trip: out and back between the same two Parties.
  edges.push({ from: 3, to: 9, round: true, offset: 0.16, speed: 0.16 });
  edges.push({ from: 9, to: 3, round: true, offset: -0.16, speed: 0.13 });
  return { nodes, edges };
}

const RADIUS = 0.78;

export function RingField({ className = "", opacity = 1 }: { className?: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { nodes, edges } = build();
    let width = 0;
    let height = 0;
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
      paint(0);
    }

    // Turns slowly, so the links and the round trip read as money moving rather than a spinner.
    function place(t: number) {
      const unit = Math.min(width, height) / 2.3;
      const cx = width / 2;
      const cy = height / 2;
      const spin = t * 0.055;
      return nodes.map((n) => {
        const angle = n.angle + spin;
        const radius = n.radius + Math.sin(t * 0.4 + n.phase) * n.bob;
        return { ...n, x: cx + Math.cos(angle) * radius * unit, y: cy + Math.sin(angle) * radius * unit };
      });
    }

    function chord(from: { x: number; y: number }, to: { x: number; y: number }, bow: number) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      // Push the midpoint off the straight line, the way a bezier edge bows in the Ring view.
      const k = len * bow * 0.5;
      return { x: mx + (-dy / len) * k, y: my + (dx / len) * k };
    }

    function paint(t: number) {
      ctx!.clearRect(0, 0, width, height);
      const unit = Math.min(width, height) / 2.3;
      const cx = width / 2;
      const cy = height / 2;
      const points = place(t);
      const centre = { x: cx, y: cy };

      // The ring itself, so the circle reads even where no edge crosses it.
      ctx!.beginPath();
      ctx!.arc(cx, cy, RADIUS * unit, 0, Math.PI * 2);
      ctx!.strokeStyle = HAIRLINE;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Trade links, thin and quiet, with the round trip on top of them.
      for (const pass of [0, 1]) {
        for (const e of edges) {
          const round = e.round;
          if ((pass === 0) === round) continue;
          const a = e.from === -1 ? centre : points[e.from];
          const b = e.to === -1 ? centre : points[e.to];
          const mid = chord(a, b, e.offset);
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
          ctx!.strokeStyle = round ? SAFFRON : MUTED;
          ctx!.lineWidth = round ? 2 : 1;
          ctx!.globalAlpha = round ? 0.85 : 1;
          ctx!.stroke();
          ctx!.globalAlpha = 1;

          // A pulse running the length of the link, so the direction of the money is visible.
          if (still) continue;
          const p = (t * e.speed) % 1;
          const q = 1 - p;
          const px = q * q * a.x + 2 * q * p * mid.x + p * p * b.x;
          const py = q * q * a.y + 2 * q * p * mid.y + p * p * b.y;
          ctx!.beginPath();
          ctx!.arc(px, py, round ? 2.6 : 1.8, 0, Math.PI * 2);
          ctx!.fillStyle = round ? SAFFRON : IRIS;
          ctx!.fill();
        }
      }

      // The Company in the middle, then the Parties.
      for (const n of points) {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.size + (n.risk ? 4 : 2), 0, Math.PI * 2);
        ctx!.strokeStyle = n.risk ? "rgba(255, 90, 82, 0.4)" : "rgba(245, 243, 248, 0.14)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }
      for (const n of points) {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx!.fillStyle = n.colour;
        ctx!.fill();
      }

      ctx!.beginPath();
      ctx!.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(128, 82, 255, 0.45)";
      ctx!.lineWidth = 1.5;
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx!.fillStyle = IRIS;
      ctx!.fill();
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
    // No point drawing a graph nobody can see, and none at all when the tab is in the background.
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
  }, [opacity]);

  return <canvas ref={ref} aria-hidden className={className} style={{ opacity }} />;
}