"use client";

import { useRef, useState } from "react";
import { TEAMS } from "@/content/scoreboard";
import styles from "./Broadcast.module.css";

/*
 * MASCOTS tab (Paulistão card): "Make the mascot break the goal". Every team's
 * goal animation, cropped to a thin band so all fit at once. Moving the mouse
 * over a card scrubs it (touch: drag): right plays, left rewinds. The slider
 * stays for keyboard use. A "drag" hint sits on each card until it's used.
 * Videos: /public/broadcast/paulistao/mascots/<slug>.mp4, encoded all-intra
 * (every frame a keyframe) so seeking follows the pointer without lag.
 */

const SRC = (slug: string) => `/broadcast/paulistao/mascots/${slug}.mp4`;
const STEPS = 1000;

function MascotRow({ slug, label }: { slug: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const [value, setValue] = useState(0);
  const [used, setUsed] = useState(false);

  const scrub = (v: number) => {
    setValue(v);
    setUsed(true);
    const el = video.current;
    if (el && el.duration) el.currentTime = (v / STEPS) * Math.max(0, el.duration - 0.04);
  };

  // Pointer x → position along the slider track (the whole card is the grip).
  const fromPointer = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    scrub(Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * STEPS));
  };

  return (
    <div
      className={styles.mascot}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e.clientX);
        e.preventDefault();
      }}
      // Mouse: just hovering scrubs (no click needed). Touch/pen: while pressed.
      onPointerMove={(e) => (e.pointerType === "mouse" || dragging.current) && fromPointer(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className={styles.mascotVideo}>
        <video ref={video} src={SRC(slug)} muted playsInline preload="auto" disablePictureInPicture aria-hidden="true" />
        <span className={styles.mascotName}>{label}</span>
        <span className={styles.mascotHint} data-hidden={used || undefined} aria-hidden="true">
          Drag <span>→</span>
        </span>
      </div>
      <label className={styles.mascotSlider}>
        <input
          ref={track}
          type="range"
          min={0}
          max={STEPS}
          step={1}
          value={value}
          onChange={(e) => scrub(Number(e.target.value))}
          aria-label={`${label}: drag to play the goal animation`}
          style={{ "--p": `${(value / STEPS) * 100}%` } as React.CSSProperties}
        />
      </label>
    </div>
  );
}

export default function BroadcastMascots() {
  return (
    <div className={styles.mascots}>
      <p className={styles.mascotsTitle}>Make the mascot break the goal</p>
      <p className={styles.sideLabel}>[ Hover ] Move across a card left ↔ right to play and rewind</p>
      <div className={styles.mascotGrid}>
        {TEAMS.map((t) => (
          <MascotRow key={t.slug} slug={t.slug} label={t.label} />
        ))}
      </div>
    </div>
  );
}
