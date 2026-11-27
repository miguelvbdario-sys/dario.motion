"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Recopando.module.css";
import { Lightbox } from "./Showcase";
import Marked from "@/components/effects/Marked";

import { useT } from "@/lib/i18n";
import { useInView } from "@/lib/useInView";
/** Intro text at the top of the tab (where to change it). */
const INTRO =
  "Recopando replays the most memorable matches from past World Cups. The vignette is all about ==nostalgia==: a typical Brazilian bedroom from the 90s to the 00s, with the CRT TV and the PS2.";

/*
 * RECOPANDO tab (2026 World Cup card): the vignette was made entirely in
 * Blender, so the tab shows it.
 *
 *   1. Render × wireframe: the 00s vignette with its Blender wireframe (same
 *      camera, rendered from the scene) on top; a split line follows the mouse
 *      or the finger. The wireframe video follows the vignette's time.
 *      The other decades play as plain videos (no wireframe).
 *   2. The scene in 3D: the 00s set in material preview the visitor can
 *      rotate (three.js, loaded only when the tab is open).
 *
 * Media in /public/broadcast/recopando.
 */
const BASE = "/broadcast/recopando";
const DECADES = ["00s", "10s", "70s", "80s", "90s"] as const;
type Decade = (typeof DECADES)[number];
/** Only this decade has the wireframe (render + 3D). */
const WIRE: Decade = "00s";

function Compare({ decade, active }: { decade: Decade; active: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLVideoElement>(null);
  const wire = useRef<HTMLVideoElement>(null);
  const [split, setSplit] = useState(50);
  /** "MOVE THE LINE" hint: hidden while the pointer is over the compare, back (at the line) when it leaves. */
  const [moved, setMoved] = useState(false);
  const hasWire = decade === WIRE;
  const seen = useInView(box);

  // Play/pause with the card; the wireframe video follows the vignette's clock.
  useEffect(() => {
    const m = main.current;
    if (!m) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && seen && !still) m.play().catch(() => {});
    else m.pause();
    const w = wire.current;
    if (!w || !hasWire) return;
    let raf = 0;
    const sync = () => {
      if (Math.abs(w.currentTime - m.currentTime) > 0.08) w.currentTime = m.currentTime;
      if (m.paused !== w.paused) (m.paused ? w.pause() : w.play().catch(() => {}));
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [active, seen, decade, hasWire]);

  const move = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
    setMoved(true);
  };

  return (
    <div
      ref={box}
      className={styles.compare}
      data-wire={hasWire || undefined}
      onPointerMove={(e) => hasWire && move(e.clientX)}
      onPointerDown={(e) => hasWire && move(e.clientX)}
      onPointerLeave={() => setMoved(false)}
      style={{ "--split": `${split}%` } as React.CSSProperties}
    >
      <video
        key={decade}
        ref={main}
        src={`${BASE}/vinheta-${decade}.mp4`}
        poster={`${BASE}/vinheta-${decade}.jpg`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={`Recopando vignette, ${decade} version`}
      />
      {hasWire && (
        <>
          <video
            ref={wire}
            className={styles.wire}
            src={`${BASE}/wireframe-${decade}.mp4`}
            poster={`${BASE}/wireframe-${decade}.jpg`}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
          />
          <span className={styles.handle} aria-hidden="true">
            <span>‹ ›</span>
          </span>
          <span className={styles.moveHint} data-hidden={moved || undefined} data-side={split > 50 ? "right" : "left"} aria-hidden="true">
            {t("Move the line")}
          </span>
          <span className={`${styles.tag} ${styles.tagLeft}`}>{t("Final render")}</span>
          <span className={`${styles.tag} ${styles.tagRight}`}>{t("Blender wireframe")}</span>
        </>
      )}
    </div>
  );
}

export default function Recopando({ active }: { active: boolean }) {
  const t = useT();
  const [decade, setDecade] = useState<Decade>(WIRE);
  const [full, setFull] = useState(false);
  return (
    <div className={styles.root}>
      <p className={`${styles.note} ${styles.intro}`}>
        <Marked text={t(INTRO)} />
      </p>
      <Compare decade={decade} active={active} />
      {full && <Lightbox base={`${BASE}/vinheta-${decade}-full`} sound onClose={() => setFull(false)} />}
      {/* One line: decade switch on the left, "Watch full screen" on the right. */}
      <div className={styles.controls}>
        <div className={styles.decades} role="radiogroup" aria-label="Vignette version">
          {DECADES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === decade}
              className={styles.decade}
              data-on={d === decade || undefined}
              onClick={() => setDecade(d)}
            >
              {d}
              {d === WIRE && <span className={styles.wireDot}>wireframe</span>}
            </button>
          ))}
        </div>
        {/* The whole vignette alone (no wireframe), fullscreen with sound. */}
        <button type="button" className={styles.watch} data-cursor="view" onClick={() => setFull(true)}>
          <span className={styles.watchSquare} aria-hidden="true" />
          {t("Watch full screen")} · {decade}
        </button>
      </div>
    </div>
  );
}
