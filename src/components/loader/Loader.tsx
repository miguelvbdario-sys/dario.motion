"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type Lenis from "lenis";
import { markLoaded } from "@/lib/loader";
import styles from "./Loader.module.css";

/*
 * Loading screen: on black, the character's face, small, turning (a few frames
 * of the hero "look" render on a loop), then "Miguel Dario" and "motion
 * designer" with a "..." that fills while the page loads. No counter.
 *
 * It lifts once the fonts and the hero's rest frame are in, but never before
 * MIN_MS (2s, even when the page is ready sooner) and never after MAX_MS.
 * Then the hero intro plays.
 */

/** Frames of /sequence/hero-look-720 used for the turning face (also warm the hero's cache). */
const FACE_FRAMES = [49, 42, 34, 26, 18, 12, 18, 26, 34, 42, 49, 58, 68, 78, 88, 78, 68, 58];
const FACE_FPS = 6;
/** The screen stays at least this long, even if the page is ready sooner. */
const MIN_MS = 2000;
const MAX_MS = 5000;

const pad = (n: number) => String(n).padStart(3, "0");
const lenis = () => (window as unknown as { lenis?: Lenis }).lenis;

export default function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Lenis is created by a parent effect, which runs after this one.
    const stopLenis = setTimeout(() => lenis()?.stop(), 0);
    document.documentElement.style.overflow = "hidden";

    // Turning face: draw whichever frames have arrived, in order, on a loop.
    const imgs = FACE_FRAMES.map((f) => {
      const img = new Image();
      img.decoding = "async";
      img.src = `/sequence/hero-look-720/LOOK_${pad(f)}.webp`;
      return img;
    });
    let i = 0;
    let last = 0;
    let raf = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 1000 / FACE_FPS) return;
      last = t;
      const img = imgs[reduced ? 0 : i];
      if (ctx && img.complete && img.naturalWidth) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        // The face sits in the upper middle of the 720 frame: crop around it.
        const s = img.naturalWidth;
        ctx.drawImage(img, s * 0.2, s * 0.08, s * 0.62, s * 0.62, 0, 0, cv.width, cv.height);
        i = (i + 1) % imgs.length;
      }
    };
    raf = requestAnimationFrame(draw);

    const started = performance.now();
    // Ready = fonts + the hero's rest frame (what the visitor sees first). Not
    // window load: that waits for every video and held phones back for seconds.
    const compact = window.matchMedia("(max-width: 767px), (max-aspect-ratio: 3/4)").matches;
    const rest = new Image();
    rest.src = `/sequence/${compact ? "hero-look-720" : "hero-look"}/LOOK_049.webp`;
    const loaded = rest.decode().catch(() => {});
    let done = false;
    const lift = () => {
      if (done) return;
      done = true;
      // Close fast (the visitor is waiting for the page, not for the loader).
      gsap.to(el, {
        opacity: 0,
        duration: reduced ? 0.15 : 0.35,
        ease: "power2.in",
        onComplete: () => {
          cancelAnimationFrame(raf);
          document.documentElement.style.overflow = "";
          lenis()?.start();
          setGone(true);
          markLoaded();
        },
      });
    };
    Promise.all([loaded, document.fonts?.ready ?? Promise.resolve()]).then(() => {
      setTimeout(lift, Math.max(0, MIN_MS - (performance.now() - started)));
    });
    const cap = setTimeout(lift, MAX_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cap);
      clearTimeout(stopLenis);
    };
  }, []);

  if (gone) return null;
  return (
    <div ref={root} className={styles.loader} role="status" aria-live="polite" aria-label="Loading">
      <canvas ref={canvas} className={styles.face} width={160} height={160} aria-hidden="true" />
      <p className={styles.name}>Miguel Dario</p>
      <p className={styles.role}>senior motion designer</p>
      <p className={styles.dots} aria-hidden="true">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </p>
    </div>
  );
}
