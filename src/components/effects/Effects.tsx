"use client";

import { useEffect } from "react";

/*
 * Small site-wide interaction effects, attached by attribute/selector so the
 * components stay untouched:
 *
 *   Magnetic   [data-magnetic]: the element leans toward the mouse while it is
 *              near (up to MAG_PULL of the distance), and springs back.
 *   Scramble   mono labels ("[ Index ]", "[ On air ]"…) and [data-scramble]:
 *              on hover the text decodes from random glyphs, left to right.
 *
 * Mouse only for magnetic and scramble; nothing runs with reduced motion.
 */

const MAG_RADIUS = 70; // px around the element where the pull starts
const MAG_PULL = 0.28;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";
const SCRAMBLE_SELECTOR = "[data-scramble], [class*='sideLabel'], [class*='playerIndexLabel']";
const SCRAMBLE_MS = 380;

export default function Effects() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    // ---------- Magnetic ----------
    type Mag = { el: HTMLElement; x: number; y: number; tx: number; ty: number };
    const mags = new Map<HTMLElement, Mag>();
    let raf = 0;
    const loop = () => {
      raf = 0;
      let moving = false;
      mags.forEach((m) => {
        m.x += (m.tx - m.x) * 0.2;
        m.y += (m.ty - m.y) * 0.2;
        if (Math.abs(m.tx - m.x) > 0.05 || Math.abs(m.ty - m.y) > 0.05) moving = true;
        else {
          m.x = m.tx;
          m.y = m.ty;
        }
        m.el.style.translate = m.x || m.y ? `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px` : "";
      });
      if (moving) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        let m = mags.get(el);
        // Measure without the current pull, so the target doesn't chase itself.
        const r = el.getBoundingClientRect();
        const ox = m ? m.x : 0;
        const oy = m ? m.y : 0;
        const cx = r.left - ox + r.width / 2;
        const cy = r.top - oy + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near =
          Math.abs(dx) < r.width / 2 + MAG_RADIUS && Math.abs(dy) < r.height / 2 + MAG_RADIUS;
        if (!m) {
          if (!near) return;
          m = { el, x: 0, y: 0, tx: 0, ty: 0 };
          mags.set(el, m);
        }
        m.tx = near ? dx * MAG_PULL : 0;
        m.ty = near ? dy * MAG_PULL : 0;
      });
      kick();
    };
    const onLeave = () => {
      mags.forEach((m) => {
        m.tx = 0;
        m.ty = 0;
      });
      kick();
    };

    // ---------- Scramble ----------
    const running = new WeakSet<Element>();
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(SCRAMBLE_SELECTOR);
      if (!el || running.has(el)) return;
      // Only plain-text labels (no child elements to break).
      if (el.childElementCount > 0 || !el.textContent?.trim()) return;
      const final = el.textContent;
      running.add(el);
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / SCRAMBLE_MS);
        const fixed = Math.floor(p * final.length);
        let out = final.slice(0, fixed);
        for (let i = fixed; i < final.length; i++) {
          const c = final[i];
          out += c === " " || c === "[" || c === "]" || c === ":" ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(step);
        else {
          el.textContent = final;
          running.delete(el);
        }
      };
      requestAnimationFrame(step);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerover", onOver);
      mags.forEach((m) => (m.el.style.translate = ""));
    };
  }, []);

  return null;
}
