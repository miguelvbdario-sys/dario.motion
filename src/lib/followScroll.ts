import gsap from "gsap";
import { reducedMotion } from "@/lib/motion";

/*
 * followScroll(el, at, duration): glide an element to `at` (0–1) of the screen
 * height while the page around it may change height (a card above collapsing,
 * another opening).
 *
 * What is animated is the element's position ON SCREEN, from where it was to
 * the focus line: every frame the scroll is set to whatever puts it there,
 *   screen(p) = from + (to - from) * ease(p),   scroll = elementDocY - screen(p)
 * so anything collapsing above it is compensated in the same frame and the
 * element never jumps; it lands exactly on the line.
 *
 * The visitor always wins: a wheel, touch or key press stops it on the spot.
 * Starting a new one cancels the previous one.
 */

type Lenis = { scrollTo: (t: number, o?: object) => void; resize?: () => void; limit?: number };
const lenis = () => (window as unknown as { lenis?: Lenis }).lenis;

let current: (() => void) | null = null;

const reduced = () => reducedMotion();

function setScroll(y: number) {
  const l = lenis();
  if (!l) return window.scrollTo(0, y);
  // Lenis caps scrolling at the page height it measured last; a card that is
  // opening has made the page taller since, so refresh it first (otherwise the
  // glide stalls at the old limit and then jumps when Lenis notices).
  if (l.limit !== undefined && y > l.limit) l.resize?.();
  l.scrollTo(y, { immediate: true, force: true });
}

export function followScroll(el: HTMLElement, at: number, duration: number, ease = "power3.inOut") {
  current?.();
  const centre = () => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  };
  const to = window.innerHeight * at;
  if (reduced() || duration <= 0) {
    setScroll(window.scrollY + centre() - to);
    return () => {};
  }
  const from = centre();
  const state = { p: 0 };
  const easeFn = gsap.parseEase(ease);
  const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
  const tween = gsap.to(state, {
    p: 1,
    duration,
    ease: "none",
    onUpdate: () => {
      const screen = from + (to - from) * easeFn(state.p);
      const y = window.scrollY + centre() - screen;
      setScroll(Math.max(0, Math.min(maxY(), y)));
    },
    onComplete: () => stop(),
  });
  const onUser = () => stop();
  const stop = () => {
    tween.kill();
    window.removeEventListener("wheel", onUser);
    window.removeEventListener("touchstart", onUser);
    window.removeEventListener("keydown", onUser);
    if (current === stop) current = null;
  };
  window.addEventListener("wheel", onUser, { passive: true });
  window.addEventListener("touchstart", onUser, { passive: true });
  window.addEventListener("keydown", onUser);
  current = stop;
  return stop;
}
