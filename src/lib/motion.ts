"use client";

import { useSyncExternalStore } from "react";
import { CALM_KEY as KEY } from "./calmBoot";

/*
 * "TURN OFF ANIMATIONS" (calm mode): a switch above the language switch.
 *
 * On, the site behaves as if the visitor's system asked for reduced motion:
 * the 3D objects become still images, the hero character stays on its rest
 * frame, smooth scrolling, entrance animations and hover effects stop. The
 * video loops keep playing (loopsPaused below).
 * Everything still works (cards open, videos play fullscreen).
 *
 * Every component asks reducedMotion() (never the media query directly), and
 * CSS uses html[data-calm] next to its prefers-reduced-motion rules.
 *
 * Remembered on the device. It also turns on by itself when the browser is
 * really struggling (under ~10 fps, see src/lib/lite.ts), unless the visitor
 * switched it off by hand before. The attribute is set before the page paints
 * by an inline script in app/layout.tsx (CALM_BOOT, src/lib/calmBoot.ts).
 */

/** Stored when the visitor turns it off by hand: never switched on automatically again. */
const OFF_BY_HAND = "0";

let calm = typeof document !== "undefined" && document.documentElement.hasAttribute("data-calm");
/** Bumped on every switch: the page content remounts with the new behaviour. */
let version = 0;
const listeners = new Set<() => void>();

export function setCalm(on: boolean, auto = false) {
  if (on === calm) return;
  if (auto) {
    try {
      if (localStorage.getItem(KEY) === OFF_BY_HAND) return;
    } catch {}
  }
  calm = on;
  version++;
  document.documentElement.toggleAttribute("data-calm", on);
  try {
    localStorage.setItem(KEY, on ? "1" : OFF_BY_HAND);
  } catch {}
  listeners.forEach((l) => l());
}

export const isCalm = () => calm;

/** True when motion should stay off: calm mode, or the system's reduced-motion setting. */
export function reducedMotion() {
  if (calm) return true;
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Muted loops (the portfolio pieces) always play, with "turn off animations"
 * and with the system's reduced-motion setting too: they are the work being
 * shown (Miguel's call). They still only play while on screen (useInView).
 * One place to change if that is ever revisited.
 */
export function loopsPaused() {
  return false;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** true while calm mode is on (re-renders when it switches). */
export function useCalm() {
  return useSyncExternalStore(subscribe, isCalm, () => false);
}

/** Changes on every switch (0 until the first one): used as a key to remount the page. */
export function useCalmVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
