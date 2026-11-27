"use client";

import { useSyncExternalStore } from "react";
import { isCalm, setCalm } from "./motion";

/*
 * LITE MODE: a lighter site for devices that can't keep up.
 *
 * Nobody is put in it by guessing from the hardware. Every visitor starts with
 * the full site; while they browse, the real frame rate is measured in the
 * moments that matter (scrolling, moving the mouse). If the typical (median)
 * frame stays slower than ~38 fps, or the page keeps freezing (one frame in
 * ten over 50 ms), in 3 of 5 two-second windows of browsing, lite mode turns on and is
 * remembered on that device, so the next visit starts light. The only
 * shortcut: a visitor who asked their system to save data.
 *
 * What changes (see each component): only the centre carousel video plays,
 * the 3D objects become still images (their first frame), and the CRT glare,
 * scanlines and the carousel reflection are removed (CSS: html[data-lite]).
 */

/* v2: the first version decided on the average frame rate, so a few one-off
   pauses (an embed loading, a big image decoding) could push a fast computer
   into lite mode; earlier decisions are forgotten. */
const KEY = "site-lite-v2";
/** A window is "slow" when its TYPICAL (median) frame takes longer than this: ~38 fps. */
const SLOW_FRAME_MS = 26;
/**
 * ...or when it stutters: one frame in ten (the 90th percentile) takes longer
 * than this. The median alone missed browsers that run fine most of the time
 * but freeze for a few hundred ms again and again (Safari on a Mac never
 * switched to lite while the page kept locking up).
 */
const STUTTER_FRAME_MS = 50;
const WINDOW_MS = 2000;
/** Lite mode turns on after BAD_WINDOWS slow windows among the last RECENT_WINDOWS. */
const BAD_WINDOWS = 3;
const RECENT_WINDOWS = 5;
/**
 * Still struggling (typical frame over 100 ms, under ~10 fps) in 2 of the last
 * RECENT_WINDOWS windows, even after lite mode: "turn off animations" switches
 * on by itself (src/lib/motion.ts), unless the visitor turned it off by hand.
 */
const CALM_FRAME_MS = 100;
const CALM_WINDOWS = 2;
/** Ignore the first seconds (loader, first decodes, compiling). */
const WARMUP_MS = 4000;
/** Stop watching after this many good windows: the device copes. */
const GOOD_WINDOWS_TO_STOP = 20;

let lite = false;
const listeners = new Set<() => void>();

function apply(on: boolean, remember: boolean) {
  if (lite === on) return;
  lite = on;
  document.documentElement.toggleAttribute("data-lite", on);
  if (remember) {
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {}
  }
  listeners.forEach((l) => l());
}

let started = false;

/** Called once on the client (from the root layout's provider). */
export function startLiteWatch() {
  if (started || typeof window === "undefined") return;
  started = true;

  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
    localStorage.removeItem("site-lite"); // the v1 decision
  } catch {}
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (saved === "1" || saveData) apply(true, false);
  // Animations already off: nothing left to decide. (Lite already on: keep
  // watching, only to switch the animations off if the page still crawls.)
  if (isCalm()) return;

  // Measure only while something is moving on screen: frames while the page
  // sits still say nothing (and rAF slows down in idle tabs).
  let lastInput = 0;
  const onInput = () => (lastInput = performance.now());
  window.addEventListener("scroll", onInput, { passive: true });
  window.addEventListener("pointermove", onInput, { passive: true });
  window.addEventListener("touchmove", onInput, { passive: true });
  window.addEventListener("wheel", onInput, { passive: true });

  const t0 = performance.now();
  let winStart = 0;
  let last = 0;
  let deltas: number[] = [];
  /** The last RECENT_WINDOWS verdicts (true = slow). */
  const recent: boolean[] = [];
  /** The last RECENT_WINDOWS verdicts for "turn off animations" (true = under ~10 fps). */
  const crawl: boolean[] = [];
  let good = 0;
  let raf = 0;

  const stop = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onInput);
    window.removeEventListener("pointermove", onInput);
    window.removeEventListener("touchmove", onInput);
    window.removeEventListener("wheel", onInput);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    // Judged at the START of this frame (the previous tick): a page that froze
    // for longer than 400 ms right after an input still counts that freeze
    // (judged at the end, the longest freezes were the ones thrown away).
    const from = last || now;
    const active = from - lastInput < 400 && document.visibilityState === "visible" && now - t0 > WARMUP_MS;
    if (!active) {
      winStart = 0;
      last = 0;
      deltas = [];
      return;
    }
    if (last) deltas.push(now - last);
    last = now;
    if (!winStart) winStart = now;
    if (now - winStart < WINDOW_MS || deltas.length < 10) return;
    // The median ignores one-off pauses; the 90th percentile catches a page
    // that keeps freezing. A slow window needs either, and lite mode needs
    // several slow windows close together (one bad moment is not enough).
    const sorted = deltas.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    winStart = now;
    deltas = [];
    crawl.push(median > CALM_FRAME_MS);
    if (crawl.length > RECENT_WINDOWS) crawl.shift();
    if (crawl.filter(Boolean).length >= CALM_WINDOWS) {
      apply(true, true);
      setCalm(true, true);
      stop();
      return;
    }
    const slow = median > SLOW_FRAME_MS || p90 > STUTTER_FRAME_MS;
    recent.push(slow);
    if (recent.length > RECENT_WINDOWS) recent.shift();
    if (slow) {
      good = 0;
      // Lite mode on, but keep watching: if even the lighter site crawls,
      // the animations go off too.
      if (!lite && recent.filter(Boolean).length >= BAD_WINDOWS) apply(true, true);
    } else if (++good >= GOOD_WINDOWS_TO_STOP) stop();
  };
  raf = requestAnimationFrame(tick);
}

export const isLite = () => lite;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** true once the device is in lite mode (re-renders when it switches). */
export function useLite() {
  return useSyncExternalStore(subscribe, isLite, () => false);
}
