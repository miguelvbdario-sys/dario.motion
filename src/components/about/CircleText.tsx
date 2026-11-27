"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame } from "@/components/effects/scrollFx";
import styles from "./CircleText.module.css";

import { useT } from "@/lib/i18n";
import { reducedMotion } from "@/lib/motion";
/*
 * Round badge on the photo's corner: a sentence written around a circle that
 * turns with the scroll (DEG_PER_PX), backwards when scrolling up.
 *
 * Where to change the words: TEXT (it repeats to fill the ring).
 */
const TEXT = "Motion Designer • Sports • 8 Years • ";
const DEG_PER_PX = 0.18;

export default function CircleText() {
  const t = useT();
  const ring = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el || reducedMotion()) return;
    return onScrollFrame((vh, r: DOMRect) => {
      if (r.bottom < -100 || r.top > vh + 100) return;
      el.style.transform = `rotate(${(window.scrollY * DEG_PER_PX) % 360}deg)`;
    }, () => el.getBoundingClientRect());
  }, []);

  // Enters first (AboutIntro slides [data-enter] in by --i), the photo after.
  return (
    <div className={styles.badge} aria-hidden="true" data-enter style={{ "--i": 0 } as React.CSSProperties}>
      <svg ref={ring} className={styles.ring} viewBox="0 0 200 200">
        <defs>
          <path id="about-circle-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text className={styles.text}>
          <textPath href="#about-circle-path" textLength="488" lengthAdjust="spacing">
            {t(TEXT)}
          </textPath>
        </text>
      </svg>
      <span className={styles.dot} />
    </div>
  );
}
