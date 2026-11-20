"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { DEFAULT_AWAY, DEFAULT_HOME, SCOREBOARD_CROP, SCOREBOARD_FPS, TEAMS } from "@/content/scoreboard";
import { ScoreboardEngine, type BoardStatus, type ShieldState, type Side } from "@/lib/scoreboardEngine";
import styles from "./Broadcast.module.css";

/*
 * The interactive scoreboard, inside the PAULISTÃO BROADCAST card.
 * Same engine and rules as before (src/lib/scoreboardEngine.ts): IN/OUT, team
 * swap on the matching frame, goals (only after the IN), shield mode, clock and
 * score. Frames start loading the first time the card opens.
 */

const teamLabel = (slug: string) => TEAMS.find((t) => t.slug === slug)?.label ?? slug;
const pad = (n: number, l = 2) => String(n).padStart(l, "0");

const STATUS_TEXT: Record<BoardStatus, string> = {
  hidden: "Off air",
  in: "Going live",
  shown: "On air",
  out: "Going off air",
};

/** Crest of a team (webp in /public/scoreboard/crests, named by slug). */
const crestSrc = (slug: string) => `/scoreboard/crests/${slug}.webp`;

/**
 * Team choice as a small grid of crests (the same grid on both sides). The
 * selected team is marked; hovering a crest turns its tile white (clickable).
 */
export function CrestGrid({
  side,
  team,
  busy,
  onTeam,
  available,
}: {
  side: Side;
  team: string;
  busy: boolean;
  onTeam: (slug: string) => void;
  /** Only these teams can be picked (others stay disabled). Default: all. */
  available?: string[];
}) {
  const sideName = side === "home" ? "Home" : "Away";
  return (
    <div className={styles.crests} role="radiogroup" aria-label={`${sideName} team`}>
      {TEAMS.map((t) => (
        <button
          key={t.slug}
          type="button"
          role="radio"
          aria-checked={t.slug === team}
          aria-label={t.label}
          title={t.label}
          className={styles.crest}
          data-selected={t.slug === team || undefined}
          disabled={busy || (available !== undefined && !available.includes(t.slug))}
          onClick={() => {
            if (t.slug !== team) onTeam(t.slug);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={crestSrc(t.slug)} alt="" width={160} height={160} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

/**
 * Phones (scoreboard only): the crest grid becomes a compact list. Closed, it
 * shows the chosen team; tapping opens every team, crest left of the name.
 * The grid stays in the DOM for larger screens; CSS shows one or the other.
 */
export function TeamSelect({
  side,
  team,
  busy,
  onTeam,
}: {
  side: Side;
  team: string;
  busy: boolean;
  onTeam: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Close when tapping anywhere else.
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);
  const sideName = side === "home" ? "Home" : "Away";
  return (
    <div ref={box} className={styles.teamSelect} data-open={open || undefined}>
      <button
        type="button"
        className={styles.teamOption}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${sideName} team: ${teamLabel(team)}`}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crestSrc(team)} alt="" width={160} height={160} />
        <span>{teamLabel(team)}</span>
        <span className={styles.teamChevron} aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className={styles.teamList} data-lenis-prevent role="listbox" aria-label={`${sideName} team`}>
          {TEAMS.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                role="option"
                aria-selected={t.slug === team}
                className={styles.teamOption}
                data-selected={t.slug === team || undefined}
                onClick={() => {
                  setOpen(false);
                  if (t.slug !== team) onTeam(t.slug);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={crestSrc(t.slug)} alt="" width={160} height={160} loading="lazy" />
                <span>{t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BroadcastScoreboard({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ScoreboardEngine | null>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);

  const [home, setHome] = useState(DEFAULT_HOME);
  const [away, setAway] = useState(DEFAULT_AWAY);
  const [status, setStatus] = useState<BoardStatus>("hidden");
  const [ready, setReady] = useState(false);
  const [canGoal, setCanGoal] = useState(false);
  const [busy, setBusy] = useState<Side | null>(null);
  const [canShield, setCanShield] = useState(false);
  const [shield, setShield] = useState<ShieldState>("off");
  const [score, setScore] = useState({ home: 0, away: 0 });
  /** True once the visitor has put the board on air (goal animations then load). */
  const live = useRef(false);

  // Create the engine (and start downloading frames) the first time the card opens.
  useEffect(() => {
    const el = canvas.current;
    if (!active || !el || engine.current) return;
    const e = new ScoreboardEngine(el, DEFAULT_HOME, DEFAULT_AWAY, setStatus);
    engine.current = e;
    e.ready().then(() => setReady(true));
  }, [active]);

  // Per-frame loop, only while the board is on screen.
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    let onScreen = false;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      // Off screen (scrolled away or another tab): back to the GO LIVE state.
      if (!onScreen) engine.current?.reset();
    });
    io.observe(box);
    let lastTc = "";
    let lastScore = "";
    const tick = (_t: number, deltaMs: number) => {
      const e = engine.current;
      if (!e || !onScreen) return;
      e.tick(Math.min(deltaMs / 1000, 0.1));
      setCanGoal(e.canGoal);
      setCanShield(e.canShield);
      setShield(e.shieldState);
      const sc = e.scores;
      const key = `${sc.home}-${sc.away}`;
      if (key !== lastScore) {
        lastScore = key;
        setScore({ home: sc.home, away: sc.away });
      }
      // Readouts, written straight to the DOM (no re-render per frame).
      const s = e.clockSeconds;
      const tc = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}:${pad(Math.floor((s % 1) * SCOREBOARD_FPS))}`;
      if (tc !== lastTc && tcRef.current) tcRef.current.textContent = lastTc = tc;
      if (frameRef.current) frameRef.current.textContent = pad(e.baseFrame, 3);
    };
    gsap.ticker.add(tick);
    return () => {
      io.disconnect();
      gsap.ticker.remove(tick);
      engine.current = null;
    };
  }, []);

  const changeTeam = useCallback(async (side: Side, slug: string) => {
    const e = engine.current;
    if (!e) return;
    setBusy(side);
    await e.setTeam(side, slug);
    if (side === "home") setHome(slug);
    else setAway(slug);
    setBusy(null);
    if (live.current) e.preloadGoal(slug);
  }, []);

  // Going live: play the IN and start loading both teams' goal animations.
  const goLive = () => {
    const e = engine.current;
    if (!e) return;
    e.playIn();
    if (!live.current) {
      live.current = true;
      e.preloadGoal(home);
      e.preloadGoal(away);
    }
  };

  const onAir = status === "shown" || status === "in";
  const goalEnabled = ready && canGoal;

  return (
    <div ref={root} className={styles.board}>
      <div className={styles.boardReadouts}>
        <span aria-live="polite">
          <span className={styles.statusDot} data-status={status} aria-hidden="true" />
          {ready ? STATUS_TEXT[status] : active ? "Loading…" : "Standby"}
        </span>
        <span aria-hidden="true">
          TC <span ref={tcRef}>00:00:00:00</span>
        </span>
        <span aria-hidden="true">
          Base <span ref={frameRef}>000</span> / 119
        </span>
        <span aria-hidden="true">
          {SCOREBOARD_CROP.width} × {SCOREBOARD_CROP.height}
        </span>
      </div>

      <div className={styles.boardLayout}>
        {/* Home: crest grid + goal. */}
        <div className={styles.boardSide} data-side="home">
          <p className={styles.sideLabel}>[ Home ]</p>
          <CrestGrid side="home" team={home} busy={busy !== null} onTeam={(s) => changeTeam("home", s)} />
          <TeamSelect side="home" team={home} busy={busy !== null} onTeam={(s) => changeTeam("home", s)} />
          <button
            type="button"
            className={`${styles.filter} ${styles.ctrl}`}
            onClick={() => engine.current?.playGoal("home")}
            disabled={!goalEnabled}
          >
            <span className={styles.square} aria-hidden="true" />
            <span className={styles.filterLabel}>Goal home</span>
            <span className={styles.count}>[{pad(score.home)}]</span>
          </button>
        </div>

        {/* Centre: the board (half the width) and the program controls. */}
        <div className={styles.boardCentre}>
          <div className={styles.boardFrame}>
            <canvas
              ref={canvas}
              className={styles.boardCanvas}
              width={SCOREBOARD_CROP.width}
              height={SCOREBOARD_CROP.height}
              // One source of truth: the frame follows the crop if it changes.
              style={{ aspectRatio: `${SCOREBOARD_CROP.width} / ${SCOREBOARD_CROP.height}` }}
              role="img"
              aria-label={`Scoreboard: ${teamLabel(home)} versus ${teamLabel(away)}`}
            />
            {/* Off air: the visitor starts the IN, so they get to watch it. */}
            <div className={styles.cue} data-visible={status === "hidden" || undefined}>
              <button
                type="button"
                className={styles.goLive}
                onClick={goLive}
                disabled={!ready || status !== "hidden"}
                tabIndex={status === "hidden" ? 0 : -1}
              >
                {/* Three pulsing rings, offset in time. */}
                <span className={styles.goLiveRing} aria-hidden="true" />
                <span className={styles.goLiveRing} aria-hidden="true" />
                <span className={styles.goLiveRing} aria-hidden="true" />
                <span className={styles.goLiveDot} aria-hidden="true" />
                {ready ? "Go live" : "Loading…"}
              </button>
            </div>
          </div>

          <div className={styles.filters} role="group" aria-label="Program">
            {/* "In": desktop only (phones go on air with GO LIVE). */}
            <button
              type="button"
              className={`${styles.filter} ${styles.ctrl} ${styles.desktopOnly}`}
              data-active={onAir || undefined}
              aria-pressed={onAir}
              onClick={goLive}
              disabled={!ready || onAir}
            >
              <span className={styles.square} aria-hidden="true" />
              <span className={styles.filterLabel}>In</span>
            </button>
            <button
              type="button"
              className={`${styles.filter} ${styles.ctrl}`}
              data-active={(!onAir && ready) || undefined}
              aria-pressed={!onAir}
              onClick={() => engine.current?.playOut()}
              disabled={!ready || !onAir}
            >
              <span className={styles.square} aria-hidden="true" />
              <span className={styles.filterLabel}>Out</span>
            </button>
            <button
              type="button"
              className={`${styles.filter} ${styles.ctrl}`}
              data-active={shield === "on" || shield === "turning-on" || undefined}
              data-moving={shield === "turning-on" || shield === "turning-off" || undefined}
              aria-pressed={shield === "on" || shield === "turning-on"}
              onClick={() => engine.current?.toggleShield()}
              disabled={!ready || !canShield}
            >
              <span className={styles.square} aria-hidden="true" />
              <span className={styles.filterLabel}>Shield mode</span>
            </button>
          </div>
        </div>

        {/* Away: crest grid + goal. */}
        <div className={styles.boardSide} data-side="away">
          <p className={styles.sideLabel}>[ Away ]</p>
          <CrestGrid side="away" team={away} busy={busy !== null} onTeam={(s) => changeTeam("away", s)} />
          <TeamSelect side="away" team={away} busy={busy !== null} onTeam={(s) => changeTeam("away", s)} />
          <button
            type="button"
            className={`${styles.filter} ${styles.ctrl}`}
            onClick={() => engine.current?.playGoal("away")}
            disabled={!goalEnabled}
          >
            <span className={styles.square} aria-hidden="true" />
            <span className={styles.filterLabel}>Goal away</span>
            <span className={styles.count}>[{pad(score.away)}]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
