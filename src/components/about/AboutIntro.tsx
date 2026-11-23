"use client";

import { useEffect, useRef } from "react";
import { glide, isTouchLayout, onScrollFrame, progress, SMOOTH_TOUCH } from "@/components/effects/scrollFx";
import styles from "./AboutIntro.module.css";

/*
 * Scroll sequence right before ABOUT (scrub, ~1.4 screens of scroll while the
 * screen holds still):
 *
 *   0 – 45%   three video cuts, full screen, with "MIGUEL DARIO" over them as
 *             a red outline (the cuts switch with the scroll; a quick inverted
 *             frame now and then).
 *   45 – 100% MIGUEL rises and DARIO sinks out of the screen while a red
 *             circle grows from the middle until the screen is red, which
 *             runs straight into the ABOUT section (unchanged).
 *
 * Where to change the videos: CLIPS (files in /public). Swap in your own clips
 * here; they load only when the section gets close.
 */
const CLIPS = ["/projects/palmeiras.mp4", "/projects/copazona.mp4", "/projects/flamengo.mp4"];
const CUTS_END = 0.45;

export default function AboutIntro() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    const vids = [...root.querySelectorAll<HTMLVideoElement>("video")];
    const outline = q("[data-outline]");
    const circle = q("[data-circle]");
    const top = q("[data-top]");
    const bot = q("[data-bot]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const K = isTouchLayout() ? SMOOTH_TOUCH : 1;
    const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    let loaded = false;
    let shown = -2;
    let cur = -1;

    return onScrollFrame((vh) => {
      const r = root.getBoundingClientRect();
      // Load the clips a screen and a half before the section arrives.
      if (!loaded && r.top < vh * 2.5) {
        loaded = true;
        vids.forEach((v, i) => {
          v.src = CLIPS[i];
          v.load();
        });
      }
      if (r.bottom < -vh || r.top > vh * 1.5) {
        if (shown !== -2) {
          vids.forEach((v) => v.pause());
          shown = -2;
        }
        cur = -1;
        return;
      }
      // 0 when the track's top reaches the top of the screen, 1 when the sticky screen lets go.
      const target = progress(-r.top, 0, r.height - vh);
      const p = reduced ? (target < 0.5 ? 0 : 1) : cur < 0 ? target : glide(cur, target, K);
      cur = p;

      // Cuts: which clip shows (-1 = none, once the circle stage starts).
      const c = progress(p, 0, CUTS_END);
      const idx = p < CUTS_END ? Math.min(CLIPS.length - 1, Math.floor(c * CLIPS.length)) : -1;
      if (idx !== shown) {
        vids.forEach((v, i) => {
          v.hidden = i !== idx;
          if (i === idx) v.play().catch(() => {});
          else v.pause();
        });
        shown = idx;
      }
      outline.style.visibility = p < CUTS_END ? "visible" : "hidden";
      const blink = idx >= 0 && Math.floor(c * 60) % 9 === 0;
      vids.forEach((v) => (v.style.filter = blink ? "invert(1) hue-rotate(180deg)" : ""));

      // Open: halves leave through the edges, circle fills the screen.
      const s = eio(progress(p, CUTS_END, 0.95));
      const on = p >= CUTS_END;
      top.style.visibility = bot.style.visibility = on ? "visible" : "hidden";
      // Each half travels half a screen plus its own height: fully out at the end.
      const go = (s * vh * 0.5).toFixed(1);
      top.style.transform = `translate3d(-50%, calc(-100% - ${go}px - ${(s * 20).toFixed(2)}%), 0)`;
      bot.style.transform = `translate3d(-50%, calc(0% + ${go}px + ${(s * 20).toFixed(2)}%), 0)`;
      circle.style.visibility = on ? "visible" : "hidden";
      circle.style.transform = `translate3d(-50%, -50%, 0) scale(${(0.15 + eio(progress(p, CUTS_END, 1)) * 9).toFixed(3)})`;
      return p !== target;
    });
  }, []);

  return (
    <div ref={track} className={styles.track} aria-hidden="true">
      <div className={styles.stage}>
        {CLIPS.map((_, i) => (
          <video key={i} className={styles.clip} muted loop playsInline preload="none" hidden />
        ))}
        <p className={styles.outline} data-outline>
          Miguel <br />
          Dario
        </p>
        <span className={styles.circle} data-circle />
        <p className={`${styles.half} ${styles.top}`} data-top>
          Miguel
        </p>
        <p className={`${styles.half} ${styles.bot}`} data-bot>
          Dario
        </p>
      </div>
    </div>
  );
}
