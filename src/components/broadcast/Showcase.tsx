"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Showcase.module.css";

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
      />
      {n > 1 && (
        <>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Previous process video" onClick={() => step(-1)}>
            ‹
          </button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Next process video" onClick={() => step(1)}>
            ›
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

export default function Showcase({
  loops,
  verticals,
  active,
  compact,
}: {
  loops: string[];
  verticals: string[];
  active: boolean;
  compact: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);

  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const k = Math.max(0, Math.min(loops.length - 1, n));
    el.scrollTo({ left: (el.children[k] as HTMLElement).offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  if (compact) {
    return (
      <div className={styles.mobile}>
        <div
          ref={track}
          className={styles.swipe}
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = (el.children[0] as HTMLElement)?.offsetWidth || 1;
            setCur(Math.round(el.scrollLeft / (w + 8)));
          }}
        >
          {loops.map((b, n) => (
            <div key={b} className={styles.cell}>
              <Clip base={b} active={active && Math.abs(n - cur) <= 1} />
            </div>
          ))}
        </div>
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
        <div className={styles.verticalSmall}>
          <Vertical videos={verticals} active={active} />
        </div>
      </div>
    );
  }

  // Up to 2 loops: one column (stacked); more: two. The left/right width
  // ratio makes the loops end at the 9:16 player's height:
  // rows·(W/cols)·9/16 = V·16/9  →  W/V = 256·cols / (81·rows).
  const cols = loops.length <= 2 ? 1 : 2;
  const rows = Math.ceil(loops.length / cols);
  const ratio = ((256 * cols) / (81 * rows)).toFixed(3);

  return (
    <div className={styles.desktop} style={{ gridTemplateColumns: `minmax(0, ${ratio}fr) minmax(0, 1fr)` }}>
      <div className={styles.grid} style={{ "--cols": cols } as React.CSSProperties}>
        {loops.map((b) => (
          <div key={b} className={styles.cell}>
            <Clip base={b} active={active} />
          </div>
        ))}
      </div>
      <Vertical videos={verticals} active={active} />
    </div>
  );
}
