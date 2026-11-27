"use client";

import { useEffect, useRef } from "react";
import { glide, isTouchLayout, onScrollFrame, progress, SMOOTH_TOUCH } from "./scrollFx";
import styles from "./ScrollType.module.css";

import { useT } from "@/lib/i18n";
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

/** `outline`: an optional word before the title, drawn as a red outline only ("MORE" in MORE WORKS). */
export default function ScrollType({
  text,
  index,
  dir = 1,
  outline,
}: {
  text: string;
  index: string;
  dir?: 1 | -1;
  outline?: string;
}) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-lit", "");
      return;
    }
    const track = el.querySelector<HTMLElement>("[data-track]");
    const line = el.querySelector<HTMLElement>("[data-line]");
    // Phones: a short glide so finger jumps don't stutter (desktop copies the scroll).
    const K = isTouchLayout() ? SMOOTH_TOUCH : 1;
    let cur = -1;
    let lit = false;
    return onScrollFrame((vh, r: DOMRect) => {
      if (r.bottom < -200 || r.top > vh + 200) {
        cur = -1;
        return;
      }
      // 0 when its top enters at the bottom of the screen, 1 when its bottom leaves at the top.
      const target = progress(vh - r.top, 0, vh + r.height);
      const p = cur < 0 ? target : glide(cur, target, K);
      if (p === cur) return false;
      cur = p;
      // Written straight to transform (no CSS variables): only the compositor works.
      if (track) track.style.transform = `translate3d(calc(-25% + ${((0.5 - p) * SHIFT * dir).toFixed(3)}vw), 0, 0)`;
      if (line) line.style.transform = `scaleX(${p.toFixed(4)})`;
      if (p > 0.32 !== lit) {
        lit = p > 0.32;
        el.toggleAttribute("data-lit", lit);
      }
      return p !== target;
    }, () => el.getBoundingClientRect());
  }, [dir]);

  return (
    <div ref={root} className={styles.band} aria-hidden="true">
      <span className={styles.index}>
        <span className={styles.dot} />
        {index} — {outline ? `${t(outline)} ${t(text)}` : t(text)}
      </span>
      <div className={styles.track} data-track>
        {Array.from({ length: COPIES }, (_, i) => (
          <span key={i} className={styles.word}>
            {outline && <span className={styles.outline}>{t(outline)} </span>}
            {t(text)}
          </span>
        ))}
      </div>
      <span className={styles.line} data-line />
    </div>
  );
}
