"use client";

import { useEffect, useRef, useState } from "react";
import { TEAMS } from "@/content/scoreboard";
import { TeamSelect } from "./BroadcastScoreboard";
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
/**
 * Touch drag weight: a finger moving the full card width plays only this
 * fraction of the animation (lower = heavier). The mouse keeps the direct hover.
 */
const TOUCH_WEIGHT = 0.3;
const COMPACT_QUERY = "(max-width: 767px), (max-aspect-ratio: 3/4)";

function MascotRow({ slug, label }: { slug: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  /** Touch: where the drag started (pointer x, slider value). */
  const start = useRef({ x: 0, v: 0 });
  const [value, setValue] = useState(0);
  const [used, setUsed] = useState(false);

  /**
   * Seeks one at a time: while the video is still seeking, only the latest
   * target is kept and applied when it lands. Firing a seek per pointer move
   * let older seeks finish after newer ones, so frames jumped back and forth.
   */
  const pending = useRef<number | null>(null);
  const seek = (t: number) => {
    const el = video.current;
    if (!el) return;
    if (el.seeking) {
      pending.current = t;
      return;
    }
    el.currentTime = t;
  };
  const onSeeked = () => {
    const t = pending.current;
    pending.current = null;
    if (t !== null && video.current && Math.abs(video.current.currentTime - t) > 0.001) video.current.currentTime = t;
  };
  const scrub = (v: number) => {
    setValue(v);
    setUsed(true);
    const el = video.current;
    if (el && el.duration) seek((v / STEPS) * Math.max(0, el.duration - 0.04));
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
        if (e.pointerType === "mouse") fromPointer(e.clientX);
        else start.current = { x: e.clientX, v: value };
        e.preventDefault();
      }}
      // Mouse: just hovering scrubs (no click needed). Touch/pen: a heavy,
      // relative drag (TOUCH_WEIGHT) while pressed.
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") return fromPointer(e.clientX);
        if (!dragging.current) return;
        const w = track.current?.getBoundingClientRect().width || 1;
        const v = start.current.v + ((e.clientX - start.current.x) / w) * STEPS * TOUCH_WEIGHT;
        scrub(Math.round(Math.min(STEPS, Math.max(0, v))));
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className={styles.mascotVideo}>
        <video
          ref={video}
          src={SRC(slug)}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          onSeeked={onSeeked}
        />
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
  // Phones: one goal at a time, picked from a team list (starts on the first).
  const [compact, setCompact] = useState(false);
  const [team, setTeam] = useState(TEAMS[0].slug);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const shown = compact ? TEAMS.filter((t) => t.slug === team) : TEAMS;
  return (
    <div className={styles.mascots}>
      <p className={styles.mascotsTitle}>Make the mascot break the goal</p>
      <p className={styles.sideLabel}>
        {compact ? "[ Drag ] Slide the card left ↔ right to play and rewind" : "[ Hover ] Move across a card left ↔ right to play and rewind"}
      </p>
      {compact && <TeamSelect side="home" label="Team" team={team} busy={false} onTeam={setTeam} />}
      <div className={styles.mascotGrid}>
        {shown.map((t) => (
          <MascotRow key={t.slug} slug={t.slug} label={t.label} />
        ))}
      </div>
    </div>
  );
}
