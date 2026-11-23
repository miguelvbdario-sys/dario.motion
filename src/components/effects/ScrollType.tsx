"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame, progress } from "./scrollFx";
import styles from "./ScrollType.module.css";

/*
 * Giant section title (Tusker, site red) that crosses the screen sideways
 * while the page scrolls past it (scrub: it follows the finger / wheel, and
 * goes back when scrolling up). A thin red line under it fills up as it
 * crosses, and the small index lights up once it reaches the middle.
 *
 * Where to tune: SHIFT (how far it travels) here; size in ScrollType.module.css.
 */

/** Travel while the title crosses the screen, in vw (total, start to end). */
const SHIFT = 42;
const COPIES = 4;

export default function ScrollType({ text, index, dir = 1 }: { text: string; index: string; dir?: 1 | -1 }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "0.5");
      return;
    }
    let last = -1;
    return onScrollFrame((vh) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      // 0 when its top enters at the bottom of the screen, 1 when its bottom leaves at the top.
      const p = progress(vh - r.top, 0, vh + r.height);
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--x", `${((0.5 - p) * SHIFT * dir).toFixed(3)}vw`);
      el.toggleAttribute("data-lit", p > 0.32);
    });
  }, [dir]);

  return (
    <div ref={root} className={styles.band} aria-hidden="true">
      <span className={styles.index}>
        <span className={styles.dot} />
        {index} — {text}
      </span>
      <div className={styles.track}>
        {Array.from({ length: COPIES }, (_, i) => (
          <span key={i} className={styles.word}>
            {text}
          </span>
        ))}
      </div>
      <span className={styles.line} />
    </div>
  );
}
