"use client";

import { useSyncExternalStore } from "react";

/*
 * LITE MODE: a lighter site for devices that can't keep up.
 *
 * Nobody is put in it by guessing from the hardware. Every visitor starts with
 * the full site; while they browse, the real frame rate is measured in the
 * moments that matter (scrolling, moving the mouse). If it stays under
 * MIN_FPS for BAD_WINDOWS windows in a row, lite mode turns on and is
 * remembered on that device, so the next visit starts light. The only
 * shortcut: a visitor who asked their system to save data.
 *
 * What changes (see each component): only the centre carousel video plays,
 * the 3D objects become still images (their first frame), and the CRT glare,
 * scanlines and the carousel reflection are removed (CSS: html[data-lite]).
 */

const KEY = "site-lite";
const MIN_FPS = 40;
const WINDOW_MS = 2000;
const BAD_WINDOWS = 3;
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
  } catch {}
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (saved === "1" || saveData) {
    apply(true, false);
    return;
  }

  // Measure only while something is moving on screen: frames while the page
  // sits still say nothing (and rAF slows down in idle tabs).
  let lastInput = 0;
  const onInput = () => (lastInput = performance.now());
  window.addEventListener("scroll", onInput, { passive: true });
  window.addEventListener("pointermove", onInput, { passive: true });
  window.addEventListener("touchmove", onInput, { passive: true });

  const t0 = performance.now();
  let winStart = 0;
  let frames = 0;
  let bad = 0;
  let good = 0;
  let raf = 0;

  const stop = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onInput);
    window.removeEventListener("pointermove", onInput);
    window.removeEventListener("touchmove", onInput);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const active = now - lastInput < 400 && document.visibilityState === "visible" && now - t0 > WARMUP_MS;
    if (!active) {
      winStart = 0;
      frames = 0;
      return;
    }
    if (!winStart) {
      winStart = now;
      frames = 0;
      return;
    }
    frames++;
    if (now - winStart < WINDOW_MS) return;
    const fps = (frames * 1000) / (now - winStart);
    winStart = now;
    frames = 0;
    if (fps < MIN_FPS) {
      good = 0;
      if (++bad >= BAD_WINDOWS) {
        apply(true, true);
        stop();
      }
    } else {
      bad = 0;
      if (++good >= GOOD_WINDOWS_TO_STOP) stop();
    }
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
