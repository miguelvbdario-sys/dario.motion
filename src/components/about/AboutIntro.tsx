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
 *   OPEN     a red circle fills the screen while MIGUEL and DARIO (white, big)
 *            travel to the top and bottom edges, shrinking and turning dark,
 *            and land exactly on ABOUT's own name frame, which takes over.
 *   CONTENT  ABOUT's label, photo and texts slide in from the right, one after
 *            the other.
 *
 * The track overlaps ABOUT by one screen, so when the red screen hides, ABOUT
 * is right under it (the bit of track above ABOUT turns red meanwhile).
 *
 * Where to tune: the phase ranges below; videos in CLIPS (they load only when
 * the section gets close).
 */
const CLIPS = ["/projects/palmeiras.mp4", "/projects/copazona.mp4", "/projects/flamengo.mp4"];
const CUTS: [number, number] = [0, 0.45];
const OPEN: [number, number] = [0.45, 0.78];
const CONTENT: [number, number] = [0.74, 1];
/** Size of the travelling MIGUEL / DARIO at the start, relative to the frame. */
const START_SCALE = 1.35;
/** Distance the photo and texts slide in from (px). */
const SLIDE = 180;

const BONE = [239, 238, 238];
const INK = [20, 0, 0];

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
      setCut(inCuts ? Math.min(CLIPS.length - 1, Math.floor(c * CLIPS.length)) : -1);
      outline.style.visibility = p < CUTS[1] ? "" : "hidden";
      const blink = inCuts && Math.floor(c * 60) % 9 === 0;
      vids.forEach((v) => (v.style.filter = blink ? "invert(1) hue-rotate(180deg)" : ""));

      // ---- Open: circle + MIGUEL / DARIO travelling onto ABOUT's frame ----
      const o = progress(p, OPEN[0], OPEN[1]);
      const opening = p >= OPEN[0] && p < OPEN[1];
      const handed = p >= OPEN[1];
      stage.style.visibility = handed ? "hidden" : "";
      circle.style.visibility = opening ? "visible" : "hidden";
      circle.style.transform = `translate3d(-50%, -50%, 0) scale(${(0.15 + eio(progress(o, 0, 0.7)) * 9).toFixed(3)})`;
      // The bit of track above ABOUT turns red once the screen hands over.
      if (handed) root.dataset.red = "";
      else delete root.dataset.red;
      // Tells ABOUT's box reveal it may play (the red screen no longer covers it).
      if (handed) about.dataset.handed = "";
      else delete about.dataset.handed;
      frames.forEach((f) => (f.style.opacity = handed ? "1" : "0"));

      const sr = stage.getBoundingClientRect();
      const s = eio(o);
      halves.forEach((h, i) => {
        h.style.visibility = opening ? "visible" : "hidden";
        const f = frames[i];
        if (!opening || !f) return;
        const fr = f.getBoundingClientRect();
        const w = h.offsetWidth;
        const hh = h.offsetHeight;
        // Start: centred, MIGUEL just above the middle, DARIO just below, bigger.
        const k1 = fr.width / w;
        // Bigger at the start, but never wider than the screen (phones).
        const k0 = Math.min(START_SCALE * k1, (sr.width * 0.94) / w);
        const x0 = (sr.width - w * k0) / 2;
        const y0 = i === 0 ? sr.height / 2 - hh * k0 : sr.height / 2;
        // End: exactly where ABOUT's frame line is right now.
        const x1 = fr.left - sr.left;
        const y1 = fr.top - sr.top;
        h.style.transform = `translate3d(${mix(x0, x1, s).toFixed(1)}px, ${mix(y0, y1, s).toFixed(1)}px, 0) scale(${mix(k0, k1, s).toFixed(4)})`;
        const col = BONE.map((v, j) => Math.round(mix(v, INK[j], progress(o, 0.35, 0.9))));
        h.style.color = `rgb(${col.join(",")})`;
      });

      // ---- Content: slides in from the right, one after the other ----
      const e = progress(p, CONTENT[0], CONTENT[1]);
      items.forEach((el, i) => {
        const t = eo(progress(e, i * 0.12, i * 0.12 + 0.5));
        el.style.opacity = t.toFixed(3);
        el.style.translate = t >= 1 ? "" : `${((1 - t) * SLIDE).toFixed(1)}px 0`;
      });

      return p !== target;
    });
    return () => {
      unsub();
      frames.forEach((f) => (f.style.opacity = ""));
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
