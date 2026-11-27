"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MotionBranding.module.css";
import Showcase, { Lightbox } from "./Showcase";
import Marked from "@/components/effects/Marked";

import { useT } from "@/lib/i18n";
import { useInView } from "@/lib/useInView";
import { loopsPaused } from "@/lib/motion";
/*
 * MOTION BRANDING tab (2026 World Cup card).
 *
 *   1. Intro: the text on the left with two identity assets (the chair and the
 *      trophy, transparent loops) composing under it; the motion brand video on
 *      the right (muted loop; click opens it fullscreen with sound).
 *   2. The identity on air: program openings and transitions (Showcase grid).
 *
 * Where to change things: TEXT, the media paths below (/public/broadcast/copa-cazetv)
 * and APPLIED (the loops under the intro).
 */
const BASE = "/broadcast/copa-cazetv";
const TEXT =
  "Together with two other motion designers, we created the ==motion branding== for CazéTV's FIFA World Cup 2026 broadcasts. The identity became the guide for every screen the tournament needed on air.";
const APPLIED = ["quadro-1", "quadro-2", "quadro-3", "quadro-4", "transicao"].map((n) => `${BASE}/${n}`);

export default function MotionBranding({ active, compact }: { active: boolean; compact: boolean }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [full, setFull] = useState(false);
  const seen = useInView(video);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const still = loopsPaused();
    if (active && seen && !still && !full) v.play().catch(() => {});
    else v.pause();
  }, [active, seen, full]);

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <div className={styles.copy}>
          <p className={styles.text}>
            <Marked text={t(TEXT)} />
          </p>
          {/* Identity assets: the paint wipe on the chair, the trophy turning to wireframe and back. */}
          <div className={styles.assets} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.chair} src={`${BASE}/chair.webp`} alt="" loading="lazy" decoding="async" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cup} src={`${BASE}/cup.webp`} alt="" loading="lazy" decoding="async" />
          </div>
        </div>
        <div
          className={styles.brand}
          role="button"
          tabIndex={0}
          data-cursor="view"
          aria-label="Watch the motion brand fullscreen, with sound"
          onClick={() => setFull(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setFull(true))}
        >
          <video
            ref={video}
            src={`${BASE}/brand.mp4`}
            poster={`${BASE}/brand.jpg`}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
          />
          <span className={styles.tag}>{t("Motion brand")}</span>
          <span className={styles.play}>
            <span className={styles.playSquare} aria-hidden="true" />
            {t("Watch with sound")}
          </span>
        </div>
      </div>
      <p className={styles.label}>{t("[ On air ] Program openings and transitions")}</p>
      <Showcase loops={APPLIED} verticals={[]} active={active} compact={compact} pairs />
      {full && <Lightbox src={`${BASE}/brand-full.mp4`} poster={`${BASE}/brand.jpg`} sound loop={false} onClose={() => setFull(false)} />}
    </div>
  );
}
