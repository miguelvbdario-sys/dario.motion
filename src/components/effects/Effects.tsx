"use client";

import { useEffect } from "react";
import { reducedMotion, useCalm } from "@/lib/motion";

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

const MAG_RADIUS = 20; // px around the element where the pull starts (reaches a neighbour, never the whole stack)
const MAG_PULL = 0.3;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";
const SCRAMBLE_SELECTOR = "[data-scramble], [class*='sideLabel'], [class*='playerIndexLabel']";
const SCRAMBLE_MS = 650;
/** How long a scrambled letter keeps the same glyph (lower = more flicker). */
const GLYPH_MS = 70;

export default function Effects() {
  /** Re-runs when "turn off animations" switches (this sits outside the page remount). */
  const calm = useCalm();
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = reducedMotion();
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
    // Hovering a row, tab, button or card group glitches every label inside it
    // ([data-scramble], plus the mono side labels): random glyphs that settle
    // left to right in SCRAMBLE_MS.
    const running = new WeakSet<Element>();
    // Each element keeps its width while it scrambles (the random glyphs are
    // wider or narrower than the real letters and would shake the layout).
    // Copies with the same text (the white and black row titles) share one
    // animation, so they always show the same glyphs.
    const scramble = (els: HTMLElement[]) => {
      els = els.filter((el) => !running.has(el) && el.childElementCount === 0 && el.textContent?.trim());
      if (!els.length) return;
      const final = els[0].textContent ?? "";
      const saved = els.map((el) => {
        const w = el.getBoundingClientRect().width;
        const prev = { display: el.style.display, width: el.style.width, whiteSpace: el.style.whiteSpace, overflow: el.style.overflow };
        if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
        el.style.width = w + "px";
        el.style.whiteSpace = "nowrap";
        el.style.overflow = "hidden";
        running.add(el);
        return prev;
      });
      const start = performance.now();
      const glyphs: string[] = [];
      let lastGlyph = -Infinity;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / SCRAMBLE_MS);
        // A wave: a small band of scrambled letters travels from the first
        // letter to the last (never the whole word), eased in and out. Each
        // scrambled letter keeps its glyph for GLYPH_MS, so it flickers calmly.
        const band = Math.max(2, Math.round(final.length * 0.2));
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const centre = eased * (final.length + band) - band / 2;
        if (t - lastGlyph > GLYPH_MS) {
          lastGlyph = t;
          for (let i = 0; i < final.length; i++) glyphs[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        let out = "";
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          const inBand = Math.abs(i - centre) < band / 2;
          out += " []:·/".includes(c) || !inBand ? c : glyphs[i];
        }
        els.forEach((el) => (el.textContent = p < 1 ? out : final));
        if (p < 1) requestAnimationFrame(step);
        else
          els.forEach((el, i) => {
            Object.assign(el.style, saved[i]);
            running.delete(el);
          });
      };
      requestAnimationFrame(step);
    };
    let lastHost: Element | null = null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
      const host = e.target.closest<HTMLElement>("[data-scramble-group], button, a, [role='tab'], " + SCRAMBLE_SELECTOR);
      if (!host || host === lastHost) return;
      lastHost = host;
      const targets = host.matches(SCRAMBLE_SELECTOR)
        ? [host]
        : [...host.querySelectorAll<HTMLElement>(SCRAMBLE_SELECTOR)];
      // Group by text, so identical copies scramble together.
      const groups = new Map<string, HTMLElement[]>();
      targets.forEach((el) => {
        const k = el.textContent ?? "";
        groups.set(k, [...(groups.get(k) ?? []), el]);
      });
      groups.forEach(scramble);
    };
    const onOut = (e: PointerEvent) => {
      if (lastHost && !(e.relatedTarget instanceof Node && lastHost.contains(e.relatedTarget))) lastHost = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      mags.forEach((m) => (m.el.style.translate = ""));
    };
  }, [calm]);

  return null;
}
