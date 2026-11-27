"use client";

import { useEffect, useRef, useState } from "react";
import { TEAMS } from "@/content/scoreboard";
import { CrestGrid } from "./BroadcastScoreboard";
import styles from "./Broadcast.module.css";

import { useT } from "@/lib/i18n";
/*
 * SHIELDS tab (Paulistão card): pick a crest in the grid and its animation
 * plays in the square on the right, in a loop: on the last (still) frame it
 * holds HOLD_MS, then starts over.
 * Videos: /public/scoreboard/crests/animated/<slug>.mp4, all cropped square.
 * SEE KEYFRAMES swaps in the AE screen renders (keyframes visible), cropped so
 * the crest lands in the same place: .../animated/keyframes/<slug>.mp4.
 * Toggling it keeps the current time (no restart).
 */

/** Hold on the last frame before the loop starts over (ms). */
const HOLD_MS = 1500;

const animSrc = (slug: string, keyframes: boolean) =>
  `/scoreboard/crests/animated/${keyframes ? "keyframes/" : ""}${slug}.mp4`;
const label = (slug: string) => TEAMS.find((t) => t.slug === slug)?.label ?? slug;

export default function BroadcastShields({ active }: { active: boolean }) {
  const t = useT();
  const [team, setTeam] = useState("botafogo-sp");
  const [keyframes, setKeyframes] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };

  const replay = () => {
    const v = video.current;
    if (!v) return;
    clearHold();
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  // End of the animation: hold the still frame, then loop.
  const onEnded = () => {
    clearHold();
    hold.current = setTimeout(replay, HOLD_MS);
  };

  // New video (crest picked, keyframes toggled, tab shown): play from the start.
  useEffect(() => {
    const v = video.current;
    clearHold();
    if (!v) return;
    if (!active) {
      v.pause();
      return;
    }
    replay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, keyframes, active]);

  useEffect(() => clearHold, []);

  return (
    <div className={styles.shields}>
      <div className={styles.boardSide}>
        <p className={styles.sideLabel}>{t("[ Shields ] Pick a crest")}</p>
        <CrestGrid side="home" team={team} busy={false} onTeam={setTeam} first={["botafogo-sp"]} />
        <p className={styles.sideLabel}>{label(team)}</p>
      </div>
      <div className={styles.shieldStage}>
        {active && (
          <video
            ref={video}
            key={`${team}-${keyframes}`}
            src={animSrc(team, keyframes)}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            onEnded={onEnded}
            aria-label={`${label(team)} animated crest`}
          />
        )}
        <span className={styles.previewLabel}>Shield · {label(team)}</span>
        <div className={styles.stageControls}>
          <button
            type="button"
            aria-pressed={!keyframes}
            className={`${styles.filter} ${styles.ctrl} ${styles.kfToggle}`}
            onClick={() => setKeyframes((k) => !k)}
          >
            <span className={styles.square} aria-hidden="true" />
            <span className={styles.filterLabel}>{t(keyframes ? "Remove keyframes" : "See keyframes")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
