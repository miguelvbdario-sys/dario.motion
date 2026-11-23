"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import type { FrameSequence } from "@/lib/frameSequence";
import type { ScanlineField } from "@/lib/scanlineField";
import { vectorBus, type ScreenRect } from "@/lib/vectorBus";
import styles from "./Hero.module.css";

/*
 * "Vector" selection effect for the hero (mouse only).
 *
 * A single box frames whatever the cursor is over, labelled with its top-left
 * position as a percentage of the screen ("26, 57"), and glides from one
 * target to the next:
 *   - a 3D emblem: the model's exact outline on screen (published by Emblem);
 *   - an element tagged data-vector (pills, "Senior", "Motion Designer"): the whole element;
 *   - the name: the single letter under the cursor, tight to its ink;
 *   - the character: the solid body of the current frame, trimmed of glow.
 * Over the name, the selected letter also takes a colour (see .letter in
 * Hero.module.css).
 */

type VectorOverlayProps = {
  stage: RefObject<HTMLElement | null>;
  title: RefObject<HTMLHeadingElement | null>;
  headCanvas: RefObject<HTMLCanvasElement | null>;
  headSequence: RefObject<FrameSequence | null>;
  scanlines: RefObject<ScanlineField | null>;
};

/** How slowly the background light trails the mouse (per second; lower = lazier). */
const GLOW_FOLLOW = 7;
/** How quickly the box glides to a new target (per second). */
const GLIDE = 16;
/** Air around a framed element, px. */
const PAD = 6;
/** Character: only pixels this opaque count (0–255), so the soft glow is ignored. */
const CHARACTER_ALPHA = 170;
/** Character: then trim the box by this share of its size on each side. */
const CHARACTER_TRIM = 0.06;

type Metrics = { left: number; right: number; ascent: number; descent: number };

export default function VectorOverlay({
  stage,
  title,
  headCanvas,
  headSequence,
  scanlines,
}: VectorOverlayProps) {
  const layer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const frameLabel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = stage.current;
    const overlay = layer.current;
    const box = frame.current;
    if (!section || !overlay || !box) return;

    const mm = gsap.matchMedia();
    mm.add("(hover: hover) and (pointer: fine)", () => {
      let pointerX = -1;
      let pointerY = -1;
      let inside = false;
      let frameOn = 0;
      let tinted: HTMLElement | null = null;
      // Stage light that follows the mouse (background), eased.
      const glow = { x: 34, y: 64, on: 0 };
      const fr = { left: 0, top: 0, right: 0, bottom: 0 };
      let seeded = false;

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        pointerX = e.clientX;
        pointerY = e.clientY;
        inside = true;
      };
      const onLeave = () => {
        inside = false;
      };

      const within = (r: { left: number; top: number; right: number; bottom: number }, x: number, y: number) =>
        x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

      // ---------- Letter boxes for the name ----------
      const measure = document.createElement("canvas").getContext("2d");
      const metricsCache = new Map<string, Metrics>();
      const range = document.createRange();

      const glyphMetrics = (char: string, font: string): Metrics | null => {
        if (!measure) return null;
        const key = `${font}|${char}`;
        let m = metricsCache.get(key);
        if (!m) {
          measure.font = font;
          const t = measure.measureText(char);
          m = {
            left: t.actualBoundingBoxLeft,
            right: t.actualBoundingBoxRight,
            ascent: t.actualBoundingBoxAscent,
            descent: t.actualBoundingBoxDescent,
          };
          metricsCache.set(key, m);
        }
        return m;
      };

      /** The letter under (or nearest to) the cursor, with its ink box. */
      const letterAt = (x: number, y: number): { el: HTMLElement; rect: ScreenRect } | null => {
        const h1 = title.current;
        if (!h1 || !measure) return null;
        for (const word of h1.children) {
          if (!within(word.getBoundingClientRect(), x, y)) continue;
          const cs = getComputedStyle(word);
          const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          measure.font = font;
          const fontAscent = measure.measureText("H").fontBoundingBoxAscent;
          // The name is written "Miguel Dario" and shown in capitals by CSS:
          // measure the capitals, not the lowercase letters in the source.
          const upper = cs.textTransform === "uppercase";
          let best: { el: HTMLElement; rect: ScreenRect } | null = null;
          let bestDistance = Infinity;
          for (const letter of word.children) {
            const text = letter.firstChild;
            if (!(letter instanceof HTMLElement) || !(text instanceof Text)) continue;
            range.selectNodeContents(text);
            const r = range.getBoundingClientRect();
            const char = upper ? text.data.toUpperCase() : text.data;
            const m = glyphMetrics(char, font);
            if (!m) continue;
            const baseline = r.top + fontAscent;
            const ink = {
              left: r.left - m.left,
              right: r.left + m.right,
              top: baseline - m.ascent,
              bottom: baseline + m.descent,
            };
            const distance = x < ink.left ? ink.left - x : x > ink.right ? x - ink.right : 0;
            if (distance < bestDistance) {
              bestDistance = distance;
              best = { el: letter, rect: ink };
            }
          }
          return best;
        }
        return null;
      };
      // ---------- Whole elements: pills, labels, handle ----------
      const elementAt = (x: number, y: number): ScreenRect | null => {
        for (const el of section.querySelectorAll<HTMLElement>("[data-vector]")) {
          const r = el.getBoundingClientRect();
          if (within(r, x, y)) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }
        return null;
      };

      // ---------- Character: solid body of the current frame ----------
      const characterAt = (x: number, y: number): ScreenRect | null => {
        const canvas = headCanvas.current;
        const seq = headSequence.current;
        if (!canvas || !seq) return null;
        const r = canvas.getBoundingClientRect();
        if (seq.alphaAt((x - r.left) / r.width, (y - r.top) / r.height) <= 60) return null;
        const ink = seq.inkBounds(CHARACTER_ALPHA);
        if (!ink) return null;
        const w = (ink.x1 - ink.x0) * r.width;
        const h = (ink.y1 - ink.y0) * r.height;
        return {
          left: r.left + ink.x0 * r.width + w * CHARACTER_TRIM,
          right: r.left + ink.x1 * r.width - w * CHARACTER_TRIM,
          top: r.top + ink.y0 * r.height + h * CHARACTER_TRIM,
          bottom: r.top + ink.y1 * r.height - h * CHARACTER_TRIM,
        };
      };

      const written = { gx: "", gy: "", go: "", frm: "" };
      let heroOnScreen = true;
      const heroIo = new IntersectionObserver(([entry]) => {
        heroOnScreen = entry.isIntersecting;
      });
      heroIo.observe(section);

      const tick = (_t: number, deltaMs: number) => {
        // Nothing to do while the hero is off screen (and the box has faded).
        if (!heroOnScreen && frameOn < 0.01 && glow.on < 0.01) return;
        const dt = Math.min(deltaMs / 1000, 0.1);
        const s = section.getBoundingClientRect();
        const ease = (from: number, to: number, rate: number) => from + (to - from) * (1 - Math.exp(-dt * rate));

        // Priority: emblem, then labelled elements, then a letter, then the character.
        const emblem = vectorBus.activeFrame();
        let target: ScreenRect | null = emblem;
        let padded = false;
        let letter: HTMLElement | null = null;
        if (!target && inside) {
          target = elementAt(pointerX, pointerY);
          padded = !!target;
          if (!target) {
            const hit = letterAt(pointerX, pointerY);
            if (hit) {
              target = hit.rect;
              letter = hit.el;
              padded = true;
            }
          }
          if (!target) target = characterAt(pointerX, pointerY);
        }

        // ---- Background light following the mouse ----
        if (inside) {
          glow.x = ease(glow.x, ((pointerX - s.left) / s.width) * 100, GLOW_FOLLOW);
          glow.y = ease(glow.y, ((pointerY - s.top) / s.height) * 100, GLOW_FOLLOW);
        }
        glow.on = ease(glow.on, inside ? 1 : 0, inside ? 1.5 : 1);
        // Only touch the styles when a value really changed: rewriting them
        // every frame made the browser restyle the whole hero all the time.
        const gx = `${glow.x.toFixed(1)}%`;
        const gy = `${glow.y.toFixed(1)}%`;
        const go = glow.on.toFixed(2);
        if (gx !== written.gx) section.style.setProperty("--gx", (written.gx = gx));
        if (gy !== written.gy) section.style.setProperty("--gy", (written.gy = gy));
        if (go !== written.go) section.style.setProperty("--go", (written.go = go));
        // The background scanlines bend like a lens under the same light.
        // Scanlines stay straight (the lens that bent them under the mouse is off).
        scanlines.current?.draw(0.5, 0.5, 0);

        // ---- Tint: only the selected letter (CSS fades it over 0.5s) ----
        if (letter !== tinted) {
          tinted?.removeAttribute("data-active");
          letter?.setAttribute("data-active", "");
          tinted = letter;
        }
        // ---- The selection box ----
        frameOn = ease(frameOn, target ? 1 : 0, target ? 12 : 6);
        if (target) {
          const p = padded ? PAD : 0;
          const goal = {
            left: target.left - s.left - p,
            top: target.top - s.top - p,
            right: target.right - s.left + p,
            bottom: target.bottom - s.top + p,
          };
          if (!seeded) {
            Object.assign(fr, goal);
            seeded = true;
          }
          // The emblem frame already follows the model closely: glide faster.
          const rate = emblem ? 18 : GLIDE;
          fr.left = ease(fr.left, goal.left, rate);
          fr.top = ease(fr.top, goal.top, rate);
          fr.right = ease(fr.right, goal.right, rate);
          fr.bottom = ease(fr.bottom, goal.bottom, rate);
          box.style.transform = `translate3d(${fr.left.toFixed(1)}px, ${fr.top.toFixed(1)}px, 0)`;
          box.style.width = `${Math.max(fr.right - fr.left, 1).toFixed(1)}px`;
          box.style.height = `${Math.max(fr.bottom - fr.top, 1).toFixed(1)}px`;
          if (frameLabel.current) {
            frameLabel.current.textContent = `${Math.round((fr.left / s.width) * 100)}, ${Math.round((fr.top / s.height) * 100)}`;
          }
        } else if (frameOn < 0.01) {
          seeded = false;
        }
        const frm = frameOn.toFixed(3);
        if (frm !== written.frm) overlay.style.setProperty("--frm", (written.frm = frm));
      };

      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerleave", onLeave);
      gsap.ticker.add(tick);
      return () => {
        section.removeEventListener("pointermove", onMove);
        section.removeEventListener("pointerleave", onLeave);
        gsap.ticker.remove(tick);
        heroIo.disconnect();
        range.detach();
        tinted?.removeAttribute("data-active");
      };
    });
    return () => mm.revert();
  }, [stage, title, headCanvas, headSequence, scanlines]);

  return (
    <div ref={layer} className={styles.vector} aria-hidden="true">
      <div ref={frame} className={styles.vectorFrame}>
        <span ref={frameLabel} className={styles.vectorLabel} />
      </div>
    </div>
  );
}
