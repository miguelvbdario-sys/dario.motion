"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Showcase.module.css";
import Marked from "@/components/effects/Marked";

/*
 * Personal project gallery (e.g. World Cup Graphics).
 *
 * Desktop: the landscape loops in a 2-column grid on the left, a vertical
 * player on the right that plays the process videos one after the other (a
 * bar per video shows which one is on). The left column is ~2.1× the right,
 * so a 2×3 grid ends at the same height as the 9:16 player.
 *
 * Phones: the landscape loops in a swipe carousel (snap, counter, arrows),
 * the vertical player smaller and centred under it.
 *
 * Media: base paths, each with .mp4 + .jpg poster.
 */
const pad = (n: number) => String(n).padStart(2, "0");
/** Sideways finger travel (px) that changes the process video. */
const SWIPE_PX = 40;

function Clip({ base, active }: { base: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Metadata may already be in (cached) before React attached onLoadedMetadata.
    if (v.readyState >= 1 && v.videoWidth / v.videoHeight > 2.2) v.parentElement?.setAttribute("data-strip", "");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && !still) v.play().catch(() => {});
    else v.pause();
  }, [active]);
  return (
    <video
      ref={ref}
      src={`${base}.mp4`}
      poster={`${base}.jpg`}
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-hidden="true"
      // Wide strips (scoreboards) get their own grey around them, not black.
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.videoWidth / v.videoHeight > 2.2) v.parentElement?.setAttribute("data-strip", "");
      }}
    />
  );
}

function Vertical({ videos, active }: { videos: string[]; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const n = videos.length;
  const step = (d: number) => setI((k) => (k + d + n) % n);
  // Finger swipe: a sideways drag past SWIPE_PX changes video.
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && !still) v.play().catch(() => {});
    else v.pause();
  }, [active, i]);
  return (
    <div
      className={styles.vertical}
      onTouchStart={(e) => (start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s0 = start.current;
        start.current = null;
        if (!s0 || n < 2) return;
        const dx = e.changedTouches[0].clientX - s0.x;
        const dy = e.changedTouches[0].clientY - s0.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      }}
    >
      <video
        key={videos[i]}
        ref={ref}
        src={`${videos[i]}.mp4`}
        poster={`${videos[i]}.jpg`}
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={`Process video ${i + 1} of ${n}`}
        loop={n === 1}
        onEnded={() => step(1)}
        // Tap the video: next one, like stories.
        onClick={() => n > 1 && step(1)}
      />
      {n > 1 && (
        <>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Previous process video" onClick={() => step(-1)}>
            <span>‹</span>
          </button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Next process video" onClick={() => step(1)}>
            <span>›</span>
          </button>
          <div className={styles.bars}>
            {videos.map((v, k) => (
              <button
                key={v}
                type="button"
                className={styles.bar}
                data-on={k === i || undefined}
                aria-label={`Process video ${k + 1}`}
                onClick={() => setI(k)}
              />
            ))}
          </div>
        </>
      )}
      <span className={styles.tag}>Process</span>
    </div>
  );
}

/** Fullscreen view of one loop: click anywhere, ✕ or Esc closes. `sound`: plays with audio and controls. */
export function Lightbox({ base, sound, onClose }: { base: string; sound?: boolean; onClose: () => void }) {
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    lenis?.stop();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      lenis?.start();
    };
  }, [onClose]);
  return createPortal(
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Video fullscreen" onClick={onClose}>
      {/* The close button sits on the video's own corner, inside the screen. */}
      <div className={styles.frame} onClick={(e) => e.stopPropagation()}>
        <video src={`${base}.mp4`} poster={`${base}.jpg`} autoPlay muted={!sound} controls={sound} loop playsInline />
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose} autoFocus>
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function Showcase({
  loops,
  verticals,
  zoom = [],
  sound = [],
  note,
  cta,
  active,
  compact,
}: {
  loops: string[];
  /** Short description under all the videos, and an optional link button. */
  note?: string;
  cta?: { label: string; href: string };
  /** Loops that open fullscreen on click. */
  zoom?: string[];
  /** Of the zoom loops, these open with sound (and player controls). */
  sound?: string[];
  verticals: string[];
  active: boolean;
  compact: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const lightbox = open && <Lightbox base={open} sound={sound.includes(open)} onClose={() => setOpen(null)} />;

  const footer = (note || cta) && (
    <div className={styles.footer}>
      {note && (
        <p className={styles.note}>
          <Marked text={note} />
        </p>
      )}
      {cta && (
        <a href={cta.href} className={styles.cta}>
          <span className={styles.ctaSquare} aria-hidden="true" />
          {cta.label} <span aria-hidden="true">&gt;</span>
        </a>
      )}
    </div>
  );

  const cell = (b: string, on: boolean) => {
    const z = zoom.includes(b);
    return (
      <div
        key={b}
        className={styles.cell}
        data-zoom={z || undefined}
        data-cursor={z ? "view" : undefined}
        {...(z && {
          role: "button",
          tabIndex: 0,
          "aria-label": "Open video fullscreen",
          onClick: () => setOpen(b),
          onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(b)),
        })}
      >
        <Clip base={b} active={on} />
        {z && <span className={styles.zoomIcon} aria-hidden="true">⤢</span>}
      </div>
    );
  };

  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const k = Math.max(0, Math.min(loops.length - 1, n));
    el.scrollTo({ left: (el.children[k] as HTMLElement).offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  if (compact) {
    return (
      <div className={styles.mobile}>
        {/* Phones: the arrows and counter sit above the screens. */}
        <div className={styles.counter}>
          <button type="button" aria-label="Previous" onClick={() => go(cur - 1)} disabled={cur === 0}>
            ‹
          </button>
          <span>
            {pad(cur + 1)} / {pad(loops.length)}
          </span>
          <button type="button" aria-label="Next" onClick={() => go(cur + 1)} disabled={cur === loops.length - 1}>
            ›
          </button>
        </div>
        <div
          ref={track}
          className={styles.swipe}
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = (el.children[0] as HTMLElement)?.offsetWidth || 1;
            setCur(Math.round(el.scrollLeft / (w + 8)));
          }}
        >
          {loops.map((b, n) => cell(b, active && Math.abs(n - cur) <= 1))}
        </div>
        {verticals.length > 0 && (
          <div className={styles.verticalSmall}>
            <Vertical videos={verticals} active={active} />
          </div>
        )}
        {footer}
        {lightbox}
      </div>
    );
  }

  // No vertical videos: the first two loops side by side, the rest in rows of three.
  if (!verticals.length) {
    return (
      <>
        <div className={styles.flat}>
          <div className={styles.flatTop}>{loops.slice(0, 2).map((b) => cell(b, active))}</div>
          {loops.length > 2 && <div className={styles.flatRest}>{loops.slice(2).map((b) => cell(b, active))}</div>}
          {lightbox}
        </div>
        {footer}
      </>
    );
  }

  // Up to 2 loops: one column (stacked); more: two. The left/right width
  // ratio makes the loops end at the 9:16 player's height:
  // rows·(W/cols)·9/16 = V·16/9  →  W/V = 256·cols / (81·rows).
  const cols = loops.length <= 2 ? 1 : 2;
  const rows = Math.ceil(loops.length / cols);
  const ratio = ((256 * cols) / (81 * rows)).toFixed(3);

  return (
    <>
    <div className={styles.desktop} style={{ gridTemplateColumns: `minmax(0, ${ratio}fr) minmax(0, 1fr)` }}>
      <div className={styles.grid} style={{ "--cols": cols } as React.CSSProperties}>
        {loops.map((b) => cell(b, active))}
      </div>
      <Vertical videos={verticals} active={active} />
      {lightbox}
    </div>
    {footer}
    </>
  );
}
