/*
 * One shared scroll loop for scroll-linked effects (scrub). Each subscriber
 * gets called once per frame while the page scrolls or resizes, and reads its
 * own position on screen (getBoundingClientRect). Reading the real position
 * every time means a card opening above can never leave anything stuck
 * hidden: there are no precomputed start / end points to go stale.
 *
 * A subscriber returns true while it still wants frames (it is easing toward
 * its target after the scroll stopped), so the loop keeps running until all
 * of them have settled.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (vh: number, measured: any) => boolean | void;

/*
 * Two phases per frame: every subscriber's `measure` (the layout reads, e.g.
 * getBoundingClientRect) runs first, then every `fn` (the style writes) with
 * what was measured. Interleaving reads and writes forced the browser to redo
 * the page layout once per subscriber per frame, which stuttered on slower
 * machines; reading everything first costs a single layout.
 */
const subs = new Map<Fn, (() => unknown) | undefined>();
let raf = 0;
let bound = false;

const run = () => {
  raf = 0;
  const vh = window.innerHeight;
  const measured = new Map<Fn, unknown>();
  subs.forEach((measure, fn) => {
    if (measure) measured.set(fn, measure());
  });
  let more = false;
  subs.forEach((_, fn) => {
    if (fn(vh, measured.get(fn))) more = true;
  });
  if (more) kick();
};
const kick = () => {
  if (!raf) raf = requestAnimationFrame(run);
};

/** `measure` (optional): layout reads, done for all subscribers before any `fn` runs. */
export function onScrollFrame<M = undefined>(fn: (vh: number, measured: M) => boolean | void, measure?: () => M) {
  subs.set(fn as Fn, measure);
  if (!bound) {
    bound = true;
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
  }
  kick();
  return () => {
    subs.delete(fn as Fn);
  };
}

/** Ask for a frame now (after a layout change: a card opening, fonts loading). */
export const requestScrollFrame = kick;

/** 0 → 1 between two numbers, clamped. */
export const progress = (v: number, from: number, to: number) => Math.min(1, Math.max(0, (v - from) / (to - from)));

/*
 * Phones / touch: the finger scrolls in big uneven jumps, so the effects
 * follow their target with a short glide instead of copying every jump
 * (SMOOTH: share of the gap closed per frame; 1 = no glide, as on desktop).
 * The same screens also get a longer entrance range (SPAN).
 */
export const isTouchLayout = () =>
  window.matchMedia("(hover: none), (max-width: 767px), (max-aspect-ratio: 3/4)").matches;
export const SMOOTH_TOUCH = 0.12;

/** Moves `cur` toward `target` by `k`; snaps when close. */
export const glide = (cur: number, target: number, k: number) => {
  const next = cur + (target - cur) * k;
  return Math.abs(target - next) < 0.0008 ? target : next;
};
