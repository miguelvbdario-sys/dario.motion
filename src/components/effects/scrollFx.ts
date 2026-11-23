/*
 * One shared scroll loop for scroll-linked effects (scrub). Each subscriber
 * gets called once per frame while the page scrolls or resizes, and reads its
 * own position on screen (getBoundingClientRect). Reading the real position
 * every time means a card opening above can never leave anything stuck
 * hidden: there are no precomputed start / end points to go stale.
 */

type Fn = (vh: number) => void;

const subs = new Set<Fn>();
let raf = 0;
let bound = false;

const run = () => {
  raf = 0;
  const vh = window.innerHeight;
  subs.forEach((fn) => fn(vh));
};
const kick = () => {
  if (!raf) raf = requestAnimationFrame(run);
};

export function onScrollFrame(fn: Fn) {
  subs.add(fn);
  if (!bound) {
    bound = true;
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
  }
  kick();
  return () => {
    subs.delete(fn);
  };
}

/** Ask for a frame now (after a layout change: a card opening, fonts loading). */
export const requestScrollFrame = kick;

/** 0 → 1 between two numbers, clamped. */
export const progress = (v: number, from: number, to: number) => Math.min(1, Math.max(0, (v - from) / (to - from)));
