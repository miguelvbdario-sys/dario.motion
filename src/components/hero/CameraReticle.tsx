"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./Hero.module.css";

/*
 * Camera reticle (desktop): four corner brackets, like a camera's focus frame,
 * that follow the mouse over the hero with a slight lag and fade out when it
 * leaves. Light by design: one small element moved with transforms only (no
 * canvas, nothing redrawn), so the browser just slides a layer.
 */
export default function CameraReticle() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const area = el?.parentElement;
    if (!el || !area) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduced ? 0 : 0.35;
    const x = gsap.quickTo(el, "x", { duration: dur, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: dur, ease: "power3.out" });
    let shown = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = area.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const inside = px >= 0 && py >= 0 && px <= r.width && py <= r.height;
      if (inside && !shown) {
        // Appear on the cursor (no slide in from the last spot).
        gsap.set(el, { x: px, y: py });
        x(px);
        y(py);
      }
      if (inside !== shown) {
        shown = inside;
        el.toggleAttribute("data-on", inside);
      }
      if (inside) {
        x(px);
        y(py);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} className={styles.reticle} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
