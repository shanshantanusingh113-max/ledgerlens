"use client";

import { useEffect, useRef } from "react";

// The signature visual: the same graph as the Ring view, the Company in the middle and the Parties around it.
const INK = "#f5f3f8";
const MUTED = "rgba(245, 243, 248, 0.34)";
const HAIRLINE = "rgba(245, 243, 248, 0.16)";
const IRIS = "#8052ff";
const SAFFRON = "#ffb829";
const RISK = "#ff5a52";
const SPIN = 0.055;
const DRAG = 1;

// A small LCG, so the graph is the same on every load.
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
  // The ring: Parties spread round a circle, two of them picked out for the round trip.
  for (let i = 0; i < COUNT; i++) {
    const risk = i === 3 || i === 9;
    nodes.push({
      angle: (i / COUNT) * Math.PI * 2,
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
    // Trade hops: to the next Party, sometimes skipping one.
    const step = rand() > 0.72 ? 2 : 1;
    edges.push({ from: i, to: (i + step) % COUNT, round: false, offset: (rand() - 0.5) * 0.3, speed: 0.1 + rand() * 0.14 });
  }
  // Every Party also trades with the Company in the middle.
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
    let spin = 0;
    let speed = SPIN;
    let held = false;
    let last = 0;
    let lastAngle = 0;
    let dragged = 0;

    const unit = () => Math.min(width, height) / 2.3;

    function size() {
      const box = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = box.width;
      height = box.height;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(spin);
    }

    // The whole ring turns, so the links read as money moving rather than a spinner.
    function place(angle: number) {
      const r = unit();
      const cx = width / 2;
      const cy = height / 2;
      return nodes.map((n) => {
        const a = n.angle + angle;
        const radius = n.radius + Math.sin(last * 0.4 + n.phase) * n.bob;
        return { ...n, x: cx + Math.cos(a) * radius * r, y: cy + Math.sin(a) * radius * r };
      });
    }

    // Pushes the midpoint off the straight line, the way a bezier edge bows in the Ring view.
    function chord(from: { x: number; y: number }, to: { x: number; y: number }, bow: number) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const k = len * bow * 0.5;
      return { x: (from.x + to.x) / 2 + (-dy / len) * k, y: (from.y + to.y) / 2 + (dx / len) * k };
    }

    function paint(angle: number) {
      ctx!.clearRect(0, 0, width, height);
      const r = unit();
      const cx = width / 2;
      const cy = height / 2;
      const points = place(angle);
      const centre = { x: cx, y: cy };

      // The ring itself, so the circle reads where no edge crosses it.
      ctx!.beginPath();
      ctx!.arc(cx, cy, RADIUS * r, 0, Math.PI * 2);
      ctx!.strokeStyle = HAIRLINE;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Trade links first, then the round trip on top of them.
      for (const pass of [0, 1]) {
        for (const e of edges) {
          if ((pass === 0) === e.round) continue;
          const a = e.from === -1 ? centre : points[e.from];
          const b = e.to === -1 ? centre : points[e.to];
          const mid = chord(a, b, e.offset);
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
          ctx!.strokeStyle = e.round ? SAFFRON : MUTED;
          ctx!.lineWidth = e.round ? 2 : 1;
          ctx!.globalAlpha = e.round ? 0.85 : 1;
          ctx!.stroke();
          ctx!.globalAlpha = 1;

          // A pulse running the length of the link, so the direction of the money shows.
          if (still) continue;
          const p = (last * e.speed) % 1;
          const q = 1 - p;
          ctx!.beginPath();
          ctx!.arc(q * q * a.x + 2 * q * p * mid.x + p * p * b.x, q * q * a.y + 2 * q * p * mid.y + p * p * b.y, e.round ? 2.6 : 1.8, 0, Math.PI * 2);
          ctx!.fillStyle = e.round ? SAFFRON : IRIS;
          ctx!.fill();
        }
      }

      // A halo round each Party, then the Party itself.
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

      // The grabbed angle, so a drag reads as a hand on the ring.
      if (held) {
        ctx!.beginPath();
        ctx!.arc(width / 2 + Math.cos(dragged) * RADIUS * r, height / 2 + Math.sin(dragged) * RADIUS * r, 4, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(245, 243, 248, 0.8)";
        ctx!.fill();
      }
    }

    function loop(now: number) {
      if (!running) return;
      const t = now / 1000;
      const dt = Math.min(0.05, last ? t - last : 0);
      last = t;
      if (!held && !still) {
        // A fling keeps its speed for a moment, then the ring eases back to its own turn.
        speed += (SPIN - speed) * Math.min(1, dt * DRAG);
        spin += speed * dt;
      }
      paint(spin);
      frame = requestAnimationFrame(loop);
    }

    // With reduced motion there is no loop until a hand is on the ring.
    function play() {
      if (running || (still && !held)) return;
      running = true;
      last = 0;
      frame = requestAnimationFrame(loop);
    }
    function halt() {
      running = false;
      cancelAnimationFrame(frame);
    }

    function grab(event: PointerEvent) {
      held = true;
      dragged = spin;
      lastAngle = Math.atan2(event.clientY - (canvas!.getBoundingClientRect().top + height / 2), event.clientX - (canvas!.getBoundingClientRect().left + width / 2));
      canvas!.setPointerCapture(event.pointerId);
    }

    function turn(event: PointerEvent) {
      if (!held) return;
      const box = canvas!.getBoundingClientRect();
      const angle = Math.atan2(event.clientY - (box.top + height / 2), event.clientX - (box.left + width / 2));
      // Wrapping past the halfway mark would flip the ring, so take the short way round.
      let step = angle - lastAngle;
      if (step > Math.PI) step -= Math.PI * 2;
      if (step < -Math.PI) step += Math.PI * 2;
      spin += step;
      speed = step * 12;
      dragged = spin;
      lastAngle = angle;
      paint(spin);
      play();
    }

    function release(event: PointerEvent) {
      if (!held) return;
      held = false;
      if (canvas!.hasPointerCapture(event.pointerId)) canvas!.releasePointerCapture(event.pointerId);
      play();
    }

    size();
    canvas.addEventListener("pointerdown", grab);
    canvas.addEventListener("pointermove", turn);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    const watcher = new ResizeObserver(size);
    watcher.observe(canvas);
    // No point drawing a graph nobody can see, and none at all when the tab is in the background.
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting && !held ? play() : halt()), { threshold: 0 });
    seen.observe(canvas);
    const tab = () => (document.hidden || held ? halt() : play());
    document.addEventListener("visibilitychange", tab);

    return () => {
      watcher.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", tab);
      canvas.removeEventListener("pointerdown", grab);
      canvas.removeEventListener("pointermove", turn);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
      halt();
    };
  }, [opacity]);

  return <canvas ref={ref} aria-hidden className={`${className} cursor-grab touch-none active:cursor-grabbing`} style={{ opacity }} />;
}