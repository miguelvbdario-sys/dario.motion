"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Showcase.module.css";
import Marked from "@/components/effects/Marked";

import { useT } from "@/lib/i18n";
import { useInView } from "@/lib/useInView";
import { inlineSrc } from "@/content/videoVariants";
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
  const seen = useInView(ref);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Metadata may already be in (cached) before React attached onLoadedMetadata.
    if (v.readyState >= 1 && v.videoWidth / v.videoHeight > 2.2) v.parentElement?.setAttribute("data-strip", "");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && seen && !still) v.play().catch(() => {});
    else v.pause();
  }, [active, seen]);
  return (
    <video
      ref={ref}
      src={inlineSrc(base)}
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
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const n = videos.length;
  const step = (d: number) => setI((k) => (k + d + n) % n);
  // Finger swipe: a sideways drag past SWIPE_PX changes video.
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && seen && !still) v.play().catch(() => {});
    else v.pause();
  }, [active, seen, i]);
  return (
    <div
      ref={box}
      className={styles.vertical}
      onTouchStart={(e) => (start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s0 = start.current;
        start.current = null;
        if (!s0 || n < 2) return;
        const dx = e.changedTouches[0].clientX - s0.x;
        const dy = e.changedTouches[0].clientY - s0.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true; // the click that follows a swipe doesn't open fullscreen
          step(dx < 0 ? 1 : -1);
        }
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
        // Click / tap: fullscreen, where the arrows and swipe still change video.
        data-cursor="view"
        style={{ cursor: "pointer" }}
        onClick={() => {
          if (swiped.current) swiped.current = false;
          else setFull(true);
        }}
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
      <span className={styles.tag}>{t("Process")}</span>
      {full && (
        <Lightbox
          base={videos[i]}
          loop={n === 1}
          onEnded={() => step(1)}
          onPrev={n > 1 ? () => step(-1) : undefined}
          onNext={n > 1 ? () => step(1) : undefined}
          label={`${pad(i + 1)} / ${pad(n)}`}
          onClose={() => setFull(false)}
        />
      )}
    </div>
  );
}

/** Fullscreen view of one loop: click anywhere, ✕ or Esc closes. `sound`: plays with audio and controls. */
/** "Open fullscreen" mark on clickable videos (SVG, so it stays centred on every device). */
export function ZoomIcon() {
  return (
    <span className={styles.zoomIcon} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Lightbox({
  base,
  src,
  poster,
  sound,
  loop = true,
  onEnded,
  onPrev,
  onNext,
  label,
  onClose,
}: {
  base?: string;
  /** Direct file (instead of base + .mp4 / .jpg). */
  src?: string;
  poster?: string;
  sound?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  /** Gallery mode (process videos): arrows, keyboard and swipe change video. */
  onPrev?: () => void;
  onNext?: () => void;
  label?: string;
  onClose: () => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  /** Landscape video: on phones the ✕ sits above the frame instead of on it. */
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    lenis?.stop();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      lenis?.start();
    };
  }, [onClose, onPrev, onNext]);
  return createPortal(
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Video fullscreen" onClick={onClose}>
      {/* The close button sits on the video's own corner, inside the screen. */}
      <div
        className={styles.frame}
        data-wide={wide || undefined}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t0 = touch.current;
          touch.current = null;
          if (!t0) return;
          const dx = e.changedTouches[0].clientX - t0.x;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - t0.y)) (dx < 0 ? onNext : onPrev)?.();
        }}
      >
        <video
          src={src ?? `${base}.mp4`}
          poster={poster ?? (base ? `${base}.jpg` : undefined)}
          autoPlay
          muted={!sound}
          controls={sound}
          loop={loop}
          playsInline
          onEnded={onEnded}
          onLoadedMetadata={(e) => setWide(e.currentTarget.videoWidth >= e.currentTarget.videoHeight)}
        />
        {onPrev && (
          <button type="button" className={`${styles.lbArrow} ${styles.lbPrev}`} aria-label="Previous video" onClick={onPrev}>
            ‹
          </button>
        )}
        {onNext && (
          <button type="button" className={`${styles.lbArrow} ${styles.lbNext}`} aria-label="Next video" onClick={onNext}>
            ›
          </button>
        )}
        {label && <span className={styles.lbCount}>{label}</span>}
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
  sound = [],
  note,
  cta,
  active,
  compact,
  pairs,
}: {
  /** Phones: the carousel shows two videos stacked per page. */
  pairs?: boolean;
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
        <a href={cta.href} className={styles.cta} target="_blank" rel="noopener noreferrer">
          <span className={styles.ctaSquare} aria-hidden="true" />
          {cta.label} <span aria-hidden="true">&gt;</span>
        </a>
      )}
    </div>
  );

  const cell = (b: string, on: boolean) => {
    // Every loop opens fullscreen (muted unless it is in `sound`).
    const z = true;
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
        {z && <ZoomIcon />}
      </div>
    );
  };

  // Phones with `pairs`: pages of two loops, one above the other.
  const pages = compact && pairs ? Array.from({ length: Math.ceil(loops.length / 2) }, (_, i) => loops.slice(i * 2, i * 2 + 2)) : null;
  const count = pages ? pages.length : loops.length;
  // The track takes the height of the page on screen (the last page, with one
  // video, is shorter, so the card below comes up instead of leaving a gap).
  useEffect(() => {
    const el = track.current;
    if (!pages || !el) return;
    const page = el.children[cur] as HTMLElement | undefined;
    if (page) el.style.height = `${page.offsetHeight}px`;
  });

  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const k = Math.max(0, Math.min(count - 1, n));
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
            {pad(cur + 1)} / {pad(count)}
          </span>
          <button type="button" aria-label="Next" onClick={() => go(cur + 1)} disabled={cur === count - 1}>
            ›
          </button>
        </div>
        <div
          ref={track}
          className={styles.swipe}
          data-pairs={pages ? "" : undefined}
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = (el.children[0] as HTMLElement)?.offsetWidth || 1;
            setCur(Math.round(el.scrollLeft / (w + 8)));
          }}
        >
          {pages
            ? pages.map((pg, n) => (
                <div key={pg[0]} className={styles.page}>
                  {pg.map((b) => cell(b, active && Math.abs(n - cur) <= 1))}
                </div>
              ))
            : loops.map((b, n) => cell(b, active && Math.abs(n - cur) <= 1))}
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
