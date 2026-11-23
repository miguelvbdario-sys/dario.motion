"use client";

import { useEffect, useRef, useState } from "react";
import type Lenis from "lenis";
import styles from "./Timeline.module.css";

/*
 * Scroll progress drawn like an After Effects timeline: a timecode on the left
 * (the page "plays" at 30 fps, one frame every FRAME_PX of scroll), a track
 * with one marker per section and a red playhead. Clicking a marker jumps to
 * that section. Hidden at the very top of the page (the hero has its own
 * menu) and fades in once the visitor starts scrolling.
 *
 * Phones: a slimmer bar (timecode + track, no marker names) and a "back to
 * top" button above it.
 */

const SECTIONS = [
  { id: "hero", label: "Intro" },
  { id: "broadcast", label: "Broadcast" },
  { id: "works-carousel", label: "More projects" },
  { id: "about", label: "About" },
];

/** Scroll distance (px) that counts as one frame of timecode. */
const FRAME_PX = 12;
const FPS = 30;
/** Scroll (px) before the bar shows up. */
const SHOW_AFTER = 120;

const lenis = () => (window as unknown as { lenis?: Lenis }).lenis;
const pad = (n: number) => String(n).padStart(2, "0");
const timecode = (frames: number) => {
  const f = Math.max(0, Math.floor(frames));
  const s = Math.floor(f / FPS);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % FPS)}`;
};

export default function Timeline() {
  const root = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const [marks, setMarks] = useState<{ id: string; label: string; at: number }[]>([]);
  const [shown, setShown] = useState(false);
  const [past, setPast] = useState(false);

  useEffect(() => {
    let max = 1;
    let lastAts = "";
    let shownNow = false;
    let pastNow = false;
    // Section positions as a fraction of the scrollable height (the hero pin
    // adds a spacer, so they are measured from the live layout). Only re-renders
    // when a marker really moved.
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const next = SECTIONS.flatMap((s) => {
        const el = document.getElementById(s.id);
        if (!el) return [];
        const top = el.getBoundingClientRect().top + window.scrollY;
        return [{ ...s, at: Math.round(Math.min(1, Math.max(0, top / max)) * 1000) / 1000 }];
      });
      const key = next.map((m) => m.at).join();
      if (key !== lastAts) {
        lastAts = key;
        setMarks(next);
      }
    };
    // Height tweens (cards, accordions) resize the body every frame: measure at most once a frame.
    let measureRaf = 0;
    const measureSoon = () => {
      if (measureRaf) return;
      measureRaf = requestAnimationFrame(() => {
        measureRaf = 0;
        measure();
        update();
      });
    };
    const update = () => {
      const y = window.scrollY;
      const p = Math.min(1, Math.max(0, y / max));
      if (head.current) head.current.style.setProperty("--p", String(p));
      if (fill.current) fill.current.style.setProperty("--p", String(p));
      if (tc.current) tc.current.textContent = timecode(y / FRAME_PX);
      const s = y > SHOW_AFTER;
      const pa = y > window.innerHeight * 1.2;
      if (s !== shownNow) setShown((shownNow = s));
      if (pa !== pastNow) setPast((pastNow = pa));
    };
    measure();
    update();
    const ro = new ResizeObserver(measureSoon);
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    // Late layout changes (fonts, the hero pin) settle after load.
    const t = setTimeout(measure, 1500);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(measureRaf);
      window.removeEventListener("scroll", update);
      clearTimeout(t);
    };
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const l = lenis();
    if (l) l.scrollTo(id === "hero" ? 0 : el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: "auto" });
  };

  return (
    <>
      <div ref={root} className={styles.timeline} data-shown={shown || undefined}>
        <span ref={tc} className={styles.timecode} aria-hidden="true">
          00:00:00:00
        </span>
        <nav className={styles.track} aria-label="Page timeline">
          <div ref={fill} className={styles.fill} aria-hidden="true" />
          {marks.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.marker}
              style={{ left: `${m.at * 100}%` }}
              onClick={() => go(m.id)}
              aria-label={`Go to ${m.label}`}
            >
              <span className={styles.markerLabel}>{m.label}</span>
            </button>
          ))}
          <div ref={head} className={styles.playhead} aria-hidden="true" />
        </nav>
      </div>
      {/* Phones: back to the top, once the hero is behind. */}
      <button
        type="button"
        className={styles.toTop}
        data-shown={past || undefined}
        onClick={() => go("hero")}
        aria-label="Back to top"
        tabIndex={past ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </>
  );
}
