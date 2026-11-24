"use client";

import { useEffect, useRef } from "react";
import { glide, isTouchLayout, onScrollFrame, progress, SMOOTH_TOUCH } from "@/components/effects/scrollFx";
import styles from "./AboutIntro.module.css";

/*
 * Sequence right before ABOUT, tied literally to the scroll (scrolling back
 * plays it backwards). p goes 0 → 1 from the moment the screen starts coming
 * up from the bottom until it lets go:
 *
 *   CUTS     three video cuts, full screen, with "MIGUEL DARIO" over them as a
 *            red outline.
 *   OPEN     a red circle fills the screen while MIGUEL rises and DARIO sinks
 *            out of it.
 *   CONTENT  ABOUT's photo slides in from the right and the "MIGUEL DARIO"
 *            line at its bottom edge rises into place (the texts have their
 *            own box reveal, BoxReveal.tsx).
 *
 * The track overlaps ABOUT by one screen, so when the red screen hides, ABOUT
 * is right under it (the bit of track above ABOUT turns red meanwhile).
 *
 * Where to tune: the phase ranges below; videos in CLIPS (they load only when
 * the section gets close).
 */
const CLIPS = ["/projects/palmeiras.mp4", "/projects/flamengo.mp4"];
/** Share of the cuts phase Palmeiras stays on before Flamengo. */
const FIRST_CUT = 0.72;
const CUTS: [number, number] = [0, 0.5];
// The hand-over (end of OPEN) is late on purpose: ABOUT is then almost at the
// top of the screen, so no empty red shows above it.
const OPEN: [number, number] = [0.5, 0.93];
const CONTENT: [number, number] = [0.72, 1];
/** Point of OPEN where the circle is full and the stage turns see-through,
 *  so ABOUT shows behind MIGUEL / DARIO while they leave (no empty red). */
const REVEAL = 0.6;
/** Size of the travelling MIGUEL / DARIO (1 = the CSS size). */
const START_SCALE = 1.2;
/** Distance the photo and texts slide in from (px). */
const SLIDE = 180;


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
    const halves = [q("[data-top]"), q("[data-bot]")];
    const frames = [...about.querySelectorAll<HTMLElement>("[data-frame]")];
    const items = [...about.querySelectorAll<HTMLElement>("[data-enter]")].sort(
      (a, b) => Number(a.style.getPropertyValue("--i")) - Number(b.style.getPropertyValue("--i")),
    );
    const K = isTouchLayout() ? SMOOTH_TOUCH : 1;
    const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const eo = (x: number) => 1 - (1 - x) ** 3;
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;

    let loaded = false;
    let shown = -2;
    let cur = -1;

    const setCut = (idx: number) => {
      if (idx === shown) return;
      vids.forEach((v, i) => {
        v.hidden = i !== idx;
        if (i === idx) v.play().catch(() => {});
        else v.pause();
      });
      shown = idx;
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
      const target = progress(vh - r.top, 0, r.height);
      const p = cur < 0 ? target : glide(cur, target, K);
      cur = p;

      // ---- Cuts ----
      const c = progress(p, CUTS[0], CUTS[1]);
      const inCuts = p < CUTS[1] && r.top < vh;
      setCut(inCuts ? (c < FIRST_CUT ? 0 : 1) : -1);
      outline.style.visibility = p < CUTS[1] ? "" : "hidden";
      const blink = inCuts && Math.floor(c * 60) % 9 === 0;
      vids.forEach((v) => (v.style.filter = blink ? "invert(1) hue-rotate(180deg)" : ""));

      // ---- Open: circle + MIGUEL / DARIO travelling onto ABOUT's frame ----
      const o = progress(p, OPEN[0], OPEN[1]);
      const opening = p >= OPEN[0] && p < OPEN[1];
      const handed = p >= OPEN[1];
      const clear = handed || (opening && o >= REVEAL);
      stage.style.visibility = handed ? "hidden" : "";
      stage.style.background = clear ? "transparent" : "";
      circle.style.visibility = opening && !clear ? "visible" : "hidden";
      circle.style.transform = `translate3d(-50%, -50%, 0) scale(${(0.15 + eio(progress(o, 0, 0.7)) * 9).toFixed(3)})`;
      // The bit of track above ABOUT turns red once the screen hands over.
      if (clear) root.dataset.red = "";
      else delete root.dataset.red;
      // Tells ABOUT's box reveal it may play (the red screen no longer covers it).
      if (clear) about.dataset.handed = "";
      else delete about.dataset.handed;
      const sr = stage.getBoundingClientRect();
      const s = eio(o);
      halves.forEach((h, i) => {
        h.style.visibility = opening ? "visible" : "hidden";
        if (!opening) return;
        const w = h.offsetWidth;
        const hh = h.offsetHeight;
        // Big, but never wider than the screen (phones).
        const k = Math.min(START_SCALE, (sr.width * 0.94) / w);
        const x = (sr.width - w * k) / 2;
        // Start: MIGUEL just above the middle, DARIO just below. End: out of the screen.
        const y0 = i === 0 ? sr.height / 2 - hh * k : sr.height / 2;
        const y1 = i === 0 ? -hh * k - 20 : sr.height + 20;
        h.style.transform = `translate3d(${x.toFixed(1)}px, ${mix(y0, y1, s).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
      });

      // ---- Content: slides in from the right, one after the other ----
      const e = progress(p, CONTENT[0], CONTENT[1]);
      items.forEach((el, i) => {
        const t = eo(progress(e, i * 0.12, i * 0.12 + 0.5));
        el.style.opacity = t.toFixed(3);
        el.style.translate = t >= 1 ? "" : `${((1 - t) * SLIDE).toFixed(1)}px 0`;
      });
      // The "MIGUEL DARIO" line cut by the bottom edge rises into place.
      frames.forEach((f) => {
        const t = eo(progress(e, 0.1, 0.7));
        f.style.opacity = t.toFixed(3);
        f.style.translate = t >= 1 ? "" : `-50% calc(var(--frame-y) + ${((1 - t) * 100).toFixed(1)}%)`;
      });

      return p !== target;
    });
    return () => {
      unsub();
      frames.forEach((f) => {
        f.style.opacity = "";
        f.style.translate = "";
      });
      items.forEach((el) => {
        el.style.opacity = "";
        el.style.translate = "";
      });
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
        <p className={styles.half} data-top>
          Miguel
        </p>
        <p className={styles.half} data-bot>
          Dario
        </p>
      </div>
    </div>
  );
}
