"use client";

import { useEffect, useRef } from "react";
import { glide, isTouchLayout, onScrollFrame, progress, SMOOTH_TOUCH } from "@/components/effects/scrollFx";
import styles from "./AboutIntro.module.css";

/*
 * Sequence right before ABOUT. The screen holds still for a short stretch of
 * scroll (about 0.8 screen) that drives three video cuts, full screen, with
 * "MIGUEL DARIO" over them as a red outline.
 *
 * Near the end of that stretch (TRIGGER) a screen transition plays on its own
 * (TRANSITION_MS, no extra scrolling needed): MIGUEL rises and DARIO sinks out
 * of the screen while a red circle fills it. The ABOUT section already sits
 * right under this screen (the track overlaps it by one screen), so when the
 * transition ends the screen simply disappears and ABOUT is there, with its
 * photo and text rising in (data-in on #about). Scrolling back up undoes it.
 *
 * Where to change the videos: CLIPS (files in /public). They load only when
 * the section gets close.
 */
const CLIPS = ["/projects/palmeiras.mp4", "/projects/copazona.mp4", "/projects/flamengo.mp4"];
/** Share of the stretch at which the transition starts. */
const TRIGGER = 0.85;
const TRANSITION_MS = 750;

export default function AboutIntro() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = track.current;
    const about = document.getElementById("about");
    if (!root || !about) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    const stage = q("[data-stage]");
    const vids = [...root.querySelectorAll<HTMLVideoElement>("video")];
    const outline = q("[data-outline]");
    const circle = q("[data-circle]");
    const top = q("[data-top]");
    const bot = q("[data-bot]");
    const K = isTouchLayout() ? SMOOTH_TOUCH : 1;
    const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

    about.dataset.armed = "";
    let loaded = false;
    let shown = -2;
    let cur = -1;
    /** Transition: null = not started; otherwise its start time. */
    let tStart: number | null = null;
    let done = false;

    const setCut = (idx: number) => {
      if (idx === shown) return;
      vids.forEach((v, i) => {
        v.hidden = i !== idx;
        if (i === idx) v.play().catch(() => {});
        else v.pause();
      });
      shown = idx;
    };

    const drawTransition = (x: number, vh: number) => {
      const s = eio(x);
      const go = (s * vh * 0.5).toFixed(1);
      top.style.transform = `translate3d(-50%, calc(-100% - ${go}px - ${(s * 20).toFixed(2)}%), 0)`;
      bot.style.transform = `translate3d(-50%, calc(0% + ${go}px + ${(s * 20).toFixed(2)}%), 0)`;
      circle.style.transform = `translate3d(-50%, -50%, 0) scale(${(0.15 + s * 9).toFixed(3)})`;
    };

    const reset = () => {
      tStart = null;
      done = false;
      stage.style.visibility = "";
      top.style.visibility = bot.style.visibility = circle.style.visibility = "hidden";
      outline.style.visibility = "";
      delete about.dataset.in;
    };

    const unsub = onScrollFrame((vh) => {
      const r = root.getBoundingClientRect();
      if (!loaded && r.top < vh * 2.5) {
        loaded = true;
        vids.forEach((v, i) => {
          v.src = CLIPS[i];
          v.load();
        });
      }
      // Far away: pause and rest. Already past (page opened lower): show ABOUT as it ends.
      if (r.top > vh * 1.5) {
        setCut(-1);
        if (tStart !== null) reset();
        cur = -1;
        return;
      }
      const target = progress(-r.top, 0, r.height - vh);
      const p = cur < 0 ? target : glide(cur, target, K);
      cur = p;

      if (p < TRIGGER - 0.05 && tStart !== null) reset();

      if (tStart === null) {
        // Cuts, driven by the scroll.
        const c = progress(p, 0, TRIGGER);
        const idx = Math.min(CLIPS.length - 1, Math.floor(c * CLIPS.length));
        setCut(idx);
        const blink = Math.floor(c * 60) % 9 === 0;
        vids.forEach((v) => (v.style.filter = blink ? "invert(1) hue-rotate(180deg)" : ""));
        if (p >= TRIGGER) {
          tStart = performance.now();
          top.style.visibility = bot.style.visibility = circle.style.visibility = "visible";
          outline.style.visibility = "hidden";
        }
      }

      if (tStart !== null && !done) {
        const x = Math.min(1, (performance.now() - tStart) / TRANSITION_MS);
        drawTransition(x, vh);
        if (x >= 1) {
          done = true;
          setCut(-1);
          stage.style.visibility = "hidden";
          // (children set to visible would still show inside a hidden parent)
          top.style.visibility = bot.style.visibility = circle.style.visibility = "hidden";
          about.dataset.in = "";
        }
        return true; // keep frames coming while it plays
      }
      return p !== target;
    });
    return () => {
      unsub();
      delete about.dataset.armed;
      delete about.dataset.in;
    };
  }, []);

  return (
    <div ref={track} className={styles.track} aria-hidden="true">
      <div className={styles.stage} data-stage>
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
