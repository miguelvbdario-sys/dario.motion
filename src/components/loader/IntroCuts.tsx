"use client";

import { useEffect, useRef } from "react";
import styles from "./IntroCuts.module.css";

/*
 * Opening sting, between the loading screen and the hero (about 1.15s):
 *
 *   0.00–0.45s  hard cuts: frames of the projects, with solid red / white
 *               frames in between (CUTS, one slot = SLOT_MS).
 *   0.45–1.15s  "MIGUEL DARIO" builds up letter by letter in a scattered
 *               order, with holes and random glyphs, until every letter locks.
 *   1.15s       hard cut to the hero, whose own intro then plays.
 *
 * Where to change the images: CUTS (posters in /public/projects).
 */

type Cut = { img: string } | { color: string };

/** One slot each, in order (SLOT_MS long). Same images on phones (cropped to fill). */
export const CUTS: Cut[] = [
  { img: "/projects/vini-jr-hala-madrid-poster.webp" },
  { color: "#e60000" },
  { img: "/projects/copazona-poster.webp" },
  { img: "/projects/copazona-poster.webp" },
  { color: "#efeeee" },
  { img: "/projects/clash-of-titans-poster.webp" },
  { img: "/projects/clash-of-titans-poster.webp" },
  { color: "#e60000" },
  { img: "/projects/copa-poster.webp" },
];
const SLOT_MS = 50;
const CUTS_MS = CUTS.length * SLOT_MS; // 450
const NAME_MS = 700;
export const INTRO_MS = CUTS_MS + NAME_MS; // 1150

const NAME = "MIGUEL DARIO";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#/%@*";
/** Order the letters appear in (0 = first), scattered. */
const RANK = NAME.split("").map((_, i) => ((i * 7) % 12) / 12);

/** Warm the images while the loading screen is still up. */
export function preloadCuts() {
  CUTS.forEach((c) => {
    if ("img" in c) {
      const im = new Image();
      im.src = c.img;
    }
  });
}

export default function IntroCuts({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = root.current;
    const img = imgRef.current;
    const name = nameRef.current;
    if (!el || !img || !name) return;
    const letters = [...name.querySelectorAll<HTMLSpanElement>("[data-l]")];
    const start = performance.now();
    let raf = 0;
    let lastSlot = -1;

    const frame = (now: number) => {
      const t = now - start;
      if (t >= INTRO_MS) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(frame);

      if (t < CUTS_MS) {
        const slot = Math.floor(t / SLOT_MS);
        if (slot !== lastSlot) {
          lastSlot = slot;
          const c = CUTS[slot];
          if ("img" in c) {
            img.src = c.img;
            img.hidden = false;
            el.style.background = "#000";
          } else {
            img.hidden = true;
            el.style.background = c.color;
          }
        }
        return;
      }

      // Name build-up.
      if (!img.hidden) {
        img.hidden = true;
        el.style.background = "#000";
        name.hidden = false;
      }
      const a = (t - CUTS_MS) / NAME_MS; // 0 → 1
      const f = Math.floor(t / 33); // ~30 changes a second
      letters.forEach((s) => {
        const i = Number(s.dataset.l);
        const k = RANK[i];
        const appear = a > k * 0.55;
        const locked = a > 0.5 + k * 0.5;
        s.style.opacity = appear ? "1" : "0";
        s.textContent = locked ? NAME[i] : GLYPHS[(f * 7 + i * 5) % GLYPHS.length];
        s.style.color = locked || (i + f) % 3 ? "" : "#e60000";
        s.style.translate = locked ? "" : `${((i * 37 + f * 3) % 9) - 4}px ${((i * 53 + f * 5) % 11) - 5}px`;
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div ref={root} className={styles.intro} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} className={styles.cut} src={(CUTS[0] as { img: string }).img} alt="" hidden />
      <p ref={nameRef} className={styles.name} hidden>
        {NAME.split("").map((c, i) =>
          c === " " ? (
            <span key={i} className={styles.space} />
          ) : (
            <span key={i} data-l={i} style={{ opacity: 0 }}>
              {c}
            </span>
          ),
        )}
      </p>
    </div>
  );
}
