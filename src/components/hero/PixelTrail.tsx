"use client";

import { useEffect, useRef } from "react";

/*
 * Background mouse trail (desktop): the cursor leaves a trail of pixel squares
 * on a grid that fade out, each one split into red / green / blue copies
 * offset sideways, like a CRT's colour fringe, in a lighter red than the
 * background. Only runs (and only draws)
 * while there are cells alive.
 */

const CELL = 16; // px, grid size
const LIFE = 900; // ms a cell lasts
const SPLIT = 3; // px between the colour copies
const BRUSH = 1; // cells around the cursor that light up (0 = just one)

type Cell = { x: number; y: number; t: number };

export default function PixelTrail({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cells = new Map<string, Cell>();
    let dpr = 1;
    let raf = 0;
    let last: { x: number; y: number } | null = null;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mark = (px: number, py: number, now: number) => {
      const cx = Math.floor(px / CELL);
      const cy = Math.floor(py / CELL);
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        for (let dy = -BRUSH; dy <= BRUSH; dy++) {
          // A ragged brush: corners light up less often.
          if (Math.abs(dx) + Math.abs(dy) > BRUSH && Math.random() < 0.6) continue;
          const k = `${cx + dx},${cy + dy}`;
          cells.set(k, { x: (cx + dx) * CELL, y: (cy + dy) * CELL, t: now - Math.random() * 120 });
        }
      }
    };

    const draw = () => {
      raf = 0;
      const now = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cells.forEach((c, k) => {
        const a = 1 - (now - c.t) / LIFE;
        if (a <= 0) {
          cells.delete(k);
          return;
        }
        const e = a * a; // fades fast, then lingers
        // A lighter red than the background, with its colour fringe in warm
        // offsets (magenta to the left, orange to the right).
        ctx.fillStyle = `rgba(255,70,140,${0.3 * e})`;
        ctx.fillRect(c.x - SPLIT, c.y, CELL, CELL);
        ctx.fillStyle = `rgba(255,150,70,${0.3 * e})`;
        ctx.fillRect(c.x + SPLIT, c.y, CELL, CELL);
        ctx.fillStyle = `rgba(255,95,85,${0.6 * e})`;
        ctx.fillRect(c.x, c.y, CELL, CELL);
      });
      ctx.globalCompositeOperation = "source-over";
      if (cells.size) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) {
        last = null;
        return;
      }
      const now = performance.now();
      // Fill the gap between two moves so a fast swipe leaves a continuous trail.
      if (last) {
        const d = Math.hypot(x - last.x, y - last.y);
        const steps = Math.ceil(d / (CELL * 0.8));
        for (let i = 1; i < steps; i++) mark(last.x + ((x - last.x) * i) / steps, last.y + ((y - last.y) * i) / steps, now);
      }
      mark(x, y, now);
      last = { x, y };
      if (!raf) raf = requestAnimationFrame(draw);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
