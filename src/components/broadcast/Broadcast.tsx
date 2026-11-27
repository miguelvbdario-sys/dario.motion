"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { BROADCAST, type BroadcastProject } from "@/content/broadcast";
import type { Work } from "@/content/works";
import WorkPlayer from "@/components/works/WorkPlayer";
import BroadcastPanel from "./BroadcastPanel";
import Marquee from "@/components/marquee/Marquee";
import ScrollType from "@/components/effects/ScrollType";
import LangSwitch from "@/components/lang/LangSwitch";
import MotionSwitch from "@/components/lang/MotionSwitch";
import { useTr, useT } from "@/lib/i18n";
import { glide, isTouchLayout, onScrollFrame, progress, requestScrollFrame, SMOOTH_TOUCH } from "@/components/effects/scrollFx";
import { FOCUS_AT } from "./focus";
import { followScroll } from "@/lib/followScroll";
import styles from "./Broadcast.module.css";
import { loopsPaused, reducedMotion } from "@/lib/motion";

gsap.registerPlugin(CustomEase);

/*
 * BROADCAST (#broadcast): a zig-zag list of broadcast projects.
 *
 *  - Hover (mouse only): two red bars close in from top and bottom; a black
 *    copy of the row inside each bar turns the text black exactly where the
 *    red passes. A 16:9 preview card follows the cursor and flips (around X,
 *    always the same way) from one project to the next.
 *  - Click: the row stays red like a tab and its card opens right under it,
 *    full width. One open at a time; click again or Esc closes.
 *  - Reduced motion: no flip, no tilt, no bar growth; just fades.
 */

const EASE_BAR = CustomEase.create("bcBar", "0.65,0,0.35,1");
const EASE_FLIP = EASE_BAR;
const EASE_OPEN = CustomEase.create("bcOpen", "0.76,0,0.24,1");

const BAR_TIME = 0.55;
const FLIP_TIME = 0.6;
/** A flip in progress blocks media swaps and other flips for this long. */
const FLIP_LOCK_MS = 620;
const OPEN_TIME = 0.85;

/**
 * Keeps an opening card's animation from being skipped by a long frame.
 * The GSAP ticker runs without lag smoothing (Lenis needs real time), so when
 * a frame stalls right as a card opens (its content mounting; Opera also
 * processes every new <video>), the open tween jumped straight to its end and
 * the card appeared without animation. For the next ~2.5 s, any frame longer
 * than LAG_MS pushes these tweens' start later by the time lost, so they
 * resume where they were instead of jumping ahead.
 */
const LAG_MS = 90;
function lagSafe(...tweens: gsap.core.Tween[]) {
  let left = 2500;
  const tick = (_time: number, deltaMs: number) => {
    if (deltaMs > LAG_MS) {
      const lost = (deltaMs - 1000 / 60) / 1000;
      for (const tw of tweens) tw.startTime(tw.startTime() + lost);
    }
    left -= deltaMs;
    if (left <= 0) gsap.ticker.remove(tick);
  };
  // Prioritised: runs before GSAP renders this frame.
  gsap.ticker.add(tick, false, true);
}
/** Length of the glitch burst when a card opens (ms). */
const GLITCH_MS = 280;
/** Floating card offset from the cursor (px). */
const CARD_OFFSET_X = 200;
/** Card size (320×180, 16:9): centred vertically on the cursor. */
const CARD_W = 320;
const CARD_H = 180;

const BAR_FULL = "calc(50% + 1px)";

/** The row's content: title + meta (meta first on some rows). */
function RowContent({ project, black }: { project: BroadcastProject; black?: boolean }) {
  return (
    <span className={styles.content} data-meta-first={project.metaFirst || undefined} data-black={black || undefined}>
      <span className={styles.titleGroup}>
        {project.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.rowLogo} src={project.logo} alt="" aria-hidden="true" />
        )}
        <span className={styles.title}>{project.title}</span>
      </span>
      <span className={styles.meta} data-scramble>{project.meta}</span>
    </span>
  );
}

/** One face of the floating card: the preview loop, the poster, or the striped placeholder. */
function fillFace(face: HTMLDivElement | null, project: BroadcastProject | null) {
  if (!face) return;
  const video = face.querySelector("video");
  const stripes = face.querySelector<HTMLElement>("[data-stripes]");
  if (!video || !stripes) return;
  const src = project?.preview ?? null;
  if (src) {
    if (video.getAttribute("src") !== src) {
      video.src = src;
      if (project?.img) video.poster = project.img;
    }
    video.hidden = false;
    stripes.hidden = true;
    video.play().catch(() => {});
  } else {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.hidden = true;
    stripes.hidden = false;
  }
}

/**
 * Glide a row to the focus line once the visitor's scroll has settled: no
 * finger on the screen and no scroll for SETTLE_MS (phones: a scripted scroll
 * on top of the finger's momentum fights it). The finger's momentum usually
 * carries the row itself off the top of the screen, so it still glides back as
 * long as any part of its open card (row + panel) is on screen. Gives up after
 * 8s, or once the whole card has left the screen. Returns a cancel function.
 */
const SETTLE_MS = 160;
function followWhenSettled(row: HTMLElement, panel: HTMLElement | null) {
  let timer = 0;
  let touching = false;
  const giveUp = window.setTimeout(() => cancel(), 8000);
  const go = () => {
    cancel();
    const top = row.getBoundingClientRect().top;
    const bottom = (panel ?? row).getBoundingClientRect().bottom;
    if (bottom > 0 && top < window.innerHeight) followScroll(row, FOCUS_AT, OPEN_TIME, "bcOpen");
  };
  const arm = () => {
    clearTimeout(timer);
    if (!touching) timer = window.setTimeout(go, SETTLE_MS);
  };
  const down = () => {
    touching = true;
    clearTimeout(timer);
  };
  const up = () => {
    touching = false;
    arm();
  };
  const cancel = () => {
    clearTimeout(timer);
    clearTimeout(giveUp);
    window.removeEventListener("scroll", arm);
    window.removeEventListener("touchstart", down);
    window.removeEventListener("touchend", up);
    window.removeEventListener("touchcancel", up);
  };
  window.addEventListener("scroll", arm, { passive: true });
  window.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchend", up, { passive: true });
  window.addEventListener("touchcancel", up, { passive: true });
  arm();
  return cancel;
}

/** Same query as .rowThumb in the CSS: the row thumbnails only exist there. */
const THUMB_QUERY = "(max-width: 767px), (hover: none)";
function useThumbs() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(THUMB_QUERY);
    // Thumbnail loops play in every mode (src/lib/motion.ts, loopsPaused).
    const still = loopsPaused();
    const set = () => setOn(mq.matches && !still);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return on;
}

export default function Broadcast() {
  const t = useT();
  // The projects in the current language (EN / PT).
  const LIST = useTr(BROADCAST);
  const listRef = useRef(LIST);
  useLayoutEffect(() => {
    listRef.current = LIST;
  }, [LIST]);
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const cardPos = useRef<HTMLDivElement>(null);
  const cardTilt = useRef<HTMLDivElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const faces = useRef<(HTMLDivElement | null)[]>([null, null]);

  const [openId, setOpenId] = useState<string | null>(null);
  /** Projects whose card has been opened at least once (their content stays mounted). */
  const [mounted, setMounted] = useState<Set<string>>(() => new Set());
  const [playing, setPlaying] = useState<Work | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  /** Pending glitch timeouts, per card (cleared when it closes or reopens). */
  const glitchTimers = useRef<number[]>([]);
  /** Row thumbnails (phones): not rendered on desktop, so their videos never download there. */
  const thumbs = useThumbs();
  // Scroll reveal inside the cards: blocks below the screen wait hidden and,
  // as each one enters, fade in while rolling up into place (CSS: [data-sr]).
  // New content (a card or tab that opens) is picked up as it mounts.
  useEffect(() => {
    const root = section.current;
    if (!root || reducedMotion()) return;
    const SELECTOR = [
      `.${styles.aboutPoints} > li`,
      `.${styles.aboutStats} > div`,
      `.${styles.aboutChannels} > *`,
      `.${styles.aboutOutroRow}`,
      `.${styles.loopCell}`,
      `.${styles.preview}`,
      `.${styles.index}`,
      `.${styles.extra}`,
      `.${styles.swipe}`,
      `.${styles.accItem}`,
    ].join(", ");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.dataset.sr = "in";
          io.unobserve(el);
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => {
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.dataset.sr) return;
        // Only what is still below the screen waits; what is already visible stays.
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.dataset.sr = "in";
          return;
        }
        el.dataset.sr = "wait";
        io.observe(el);
      });
    };
    let raf = 0;
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), scan()));
    });
    mo.observe(root, { childList: true, subtree: true });
    scan();
    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Row entrance tied to the scroll (scrub): as a row comes up from the
  // bottom of the screen a red slab sweeps over it from its side (--a), then
  // pulls away the same way and uncovers the title (--b). Scrolling back
  // plays it in reverse. Positions are read every frame, so an open card
  // above can't leave a row stuck hidden; an open row is always shown.
  useEffect(() => {
    if (reducedMotion()) return;
    const easeOut = (t: number) => 1 - (1 - t) ** 3;
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    // Phones: a longer range and a short glide, so finger jumps don't stutter.
    const touch = isTouchLayout();
    const SPAN = touch ? 0.5 : 0.36;
    const K = touch ? SMOOTH_TOUCH : 1;
    const cur = new Map<HTMLElement, number>();
    return onScrollFrame((vh, tops: number[]) => {
      let moving = false;
      rows.current.forEach((row, i) => {
        if (!row) return;
        const top = tops[i];
        // 0 when the row's top is at 98% of the screen, 1 at 98% − SPAN.
        const target = row.dataset.open !== undefined ? 1 : progress(vh * 0.98 - top, 0, vh * SPAN);
        // An open row shows at once (no glide).
        const t = row.dataset.open !== undefined ? 1 : glide(cur.get(row) ?? target, target, K);
        cur.set(row, t);
        if (t !== target) moving = true;
        if (t >= 1) {
          if (row.dataset.rv !== undefined) {
            delete row.dataset.rv;
            row.style.removeProperty("--a");
            row.style.removeProperty("--b");
          }
          return;
        }
        row.dataset.rv = "";
        row.style.setProperty("--a", easeOut(progress(t, 0, 0.55)).toFixed(4));
        row.style.setProperty("--b", easeInOut(progress(t, 0.45, 1)).toFixed(4));
      });
      return moving;
    }, () => rows.current.map((row) => (row ? row.getBoundingClientRect().top : 0)));
  }, []);

  // Phone thumbnails: only ONE plays at a time, the row closest to the middle
  // of the screen; the others show their poster. Four 16:9 videos decoding at
  // once halved the frame rate on phones. Nothing loads before its row is near.
  useEffect(() => {
    if (!thumbs || !list.current) return;
    const vids = [...list.current.querySelectorAll<HTMLVideoElement>(`.${styles.rowThumb} video`)];
    let raf = 0;
    let current: HTMLVideoElement | null = null;
    const pick = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: HTMLVideoElement | null = null;
      let bestD = Infinity;
      for (const v of vids) {
        const r = v.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || r.height === 0) continue;
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = v;
        }
      }
      if (best === current) return;
      current?.pause();
      current = best;
      best?.play().catch(() => {});
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      vids.forEach((v) => v.pause());
    };
  }, [thumbs]);

  // Phones: rows with a thumbnail shrink their title only when its longest
  // word would run under the thumbnail (PAULISTÃO, OLIMPÍADAS...). Measured
  // per row, per language, after the fonts load and on resize (--fit).
  useLayoutEffect(() => {
    const mq = window.matchMedia(THUMB_QUERY);
    const fit = () => {
      rows.current.forEach((row) => {
        if (!row) return;
        row.style.removeProperty("--fit");
        if (!mq.matches || row.dataset.thumb === undefined) return;
        const title = row.querySelector<HTMLElement>(`:scope > .${styles.content} .${styles.title}`);
        if (!title) return;
        // The thumbnail's left edge (CSS: right 10px, width 34%) minus 10px,
        // read from the row so it holds while the row is open too.
        const r = row.getBoundingClientRect();
        const edge = r.right - 20 - r.width * 0.34;
        const box = title.getBoundingClientRect();
        const width = Math.max(box.width, title.scrollWidth);
        const room = edge - box.left;
        if (width <= room) return;
        const size = parseFloat(getComputedStyle(title).fontSize);
        row.style.setProperty("--fit", `${Math.max(18, Math.floor((size * room) / width))}px`);
      });
    };
    fit();
    // fonts.ready can resolve before the title font has even been requested;
    // refit whenever any font finishes loading too, so the title is sized for
    // the real font right away (not only on the next resize).
    document.fonts?.ready.then(fit);
    document.fonts?.addEventListener?.("loadingdone", fit);
    mq.addEventListener("change", fit);
    window.addEventListener("resize", fit);
    return () => {
      document.fonts?.removeEventListener?.("loadingdone", fit);
      mq.removeEventListener("change", fit);
      window.removeEventListener("resize", fit);
    };
  }, [LIST]);

  const openRef = useRef<string | null>(null);
  const hovered = useRef(-1);
  const reduced = useRef(false);
  const canHover = useRef(false);

  // ---------- Bars ----------
  const setBars = useCallback((i: number, on: boolean, instant = false) => {
    const row = rows.current[i];
    if (!row) return;
    const bars = row.querySelectorAll<HTMLElement>("[data-bar]");
    if (reduced.current) {
      gsap.set(bars, { height: BAR_FULL });
      gsap.to(bars, { opacity: on ? 1 : 0, duration: instant ? 0 : 0.3, overwrite: true });
      return;
    }
    gsap.set(bars, { opacity: 1 });
    gsap.to(bars, {
      height: on ? BAR_FULL : 0,
      duration: instant ? 0 : BAR_TIME,
      ease: EASE_BAR,
      overwrite: true,
    });
  }, []);

  // ---------- Floating flip card ----------
  const card = useRef({
    flips: 0,
    shown: -1, // project index on the front face, -1 = hidden
    visible: false,
    busy: false,
    target: -1, // what should show once the current flip is done
  });
  const quick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);

  const randomTilt = () => {
    if (reduced.current || !cardTilt.current) return;
    gsap.to(cardTilt.current, { rotation: gsap.utils.random(-5, 5), duration: FLIP_TIME, ease: "power1.inOut" });
  };

  const transition = useCallback((first: number) => {
    const run = (to: number): void => {
      const c = card.current;
      c.target = to;
      if (c.busy) return; // anti-bug lock: just remember the target
      const f = flipper.current;
      const pos = cardPos.current;
      if (!f || !pos) return;
      const wantVisible = to >= 0;
      if (wantVisible === c.visible && to === c.shown) return;

      const project = to >= 0 ? listRef.current[to] : null;

      if (reduced.current) {
        // No flip: fade the single front face.
        if (project) fillFace(faces.current[0], project);
        gsap.to(pos, { autoAlpha: wantVisible ? 1 : 0, duration: 0.25, overwrite: true });
        c.visible = wantVisible;
        c.shown = to;
        return;
      }

      c.busy = true;
      if (wantVisible && !c.visible) {
        // Entrance: the card waits in profile (flips·180 − 90).
        fillFace(faces.current[c.flips % 2], project);
        gsap.killTweensOf(pos, "opacity,visibility");
        gsap.set(pos, { autoAlpha: 1 });
        randomTilt();
        gsap.to(f, { rotationX: c.flips * 180, duration: FLIP_TIME, ease: EASE_FLIP });
        c.visible = true;
        c.shown = to;
      } else if (wantVisible) {
        // Row change: load the hidden face, then flip it to the front.
        c.flips++;
        fillFace(faces.current[c.flips % 2], project);
        randomTilt();
        gsap.to(f, { rotationX: c.flips * 180, duration: FLIP_TIME, ease: EASE_FLIP });
        c.shown = to;
      } else {
        // Exit: keep turning the same way, end in profile, then fade out.
        c.flips++;
        gsap.to(f, { rotationX: c.flips * 180 - 90, duration: FLIP_TIME, ease: EASE_FLIP });
        gsap.to(pos, { autoAlpha: 0, duration: 0.15, delay: 0.45 });
        c.visible = false;
        c.shown = -1;
      }

      window.setTimeout(() => {
        // Pause the face that went to the back once it is out of sight.
        faces.current[(c.flips + 1) % 2]?.querySelector("video")?.pause();
        if (!c.visible) faces.current[c.flips % 2]?.querySelector("video")?.pause();
        c.busy = false;
        // Jump straight to whatever the mouse is on now, skipping rows in between.
        if (c.target !== c.shown || (c.target >= 0) !== c.visible) run(c.target);
      }, FLIP_LOCK_MS);
    };
    run(first);
  }, []);

  /** What the card should show for the row under the mouse (never the open one). */
  const targetFor = useCallback((i: number) => {
    if (i < 0) return -1;
    return BROADCAST[i].id === openRef.current ? -1 : i;
  }, []);

  useEffect(() => {
    reduced.current = reducedMotion();
    canHover.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const f = flipper.current;
    const pos = cardPos.current;
    if (!f || !pos) return;
    gsap.set(f, { rotationX: reduced.current ? 0 : -90 });
    gsap.set(pos, { autoAlpha: 0, x: 0, y: 0 });
    quick.current = {
      x: gsap.quickTo(pos, "x", { duration: 0.45, ease: "power3.out" }),
      y: gsap.quickTo(pos, "y", { duration: 0.45, ease: "power3.out" }),
    };
    rows.current.forEach((_, i) => setBars(i, false, true));
  }, [setBars]);

  // ---------- Mouse over the list ----------
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  type MoveEvent = { clientX: number; clientY: number; target: EventTarget | null };
  const onMoveRef = useRef<(e: MoveEvent) => void>(() => {});
  const onLeaveRef = useRef<() => void>(() => {});

  const onMove = (e: MoveEvent) => {
    if (!canHover.current || !list.current) return;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    const r = list.current.getBoundingClientRect();
    // 200px right of the cursor, but never past the list's right edge (no sideways scroll).
    const x = Math.min(e.clientX - r.left + CARD_OFFSET_X, r.width - CARD_W);
    const y = e.clientY - r.top - CARD_H / 2;
    const c = card.current;
    if (!c.visible && c.target < 0) {
      // Not showing: jump into place so the entrance starts at the cursor.
      gsap.set(cardPos.current, { x, y });
    }
    quick.current?.x(x);
    quick.current?.y(y);

    const rowEl = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-row]") : null;
    const i = rowEl ? Number(rowEl.dataset.row) : -1;
    if (i !== hovered.current) {
      const prev = hovered.current;
      hovered.current = i;
      if (prev >= 0 && BROADCAST[prev].id !== openRef.current) setBars(prev, false);
      if (i >= 0 && BROADCAST[i].id !== openRef.current) setBars(i, true);
    }
    transition(targetFor(i));
  };

  // Scrolling moves the list under a still mouse (no mousemove fires): check
  // again what is under the cursor, or let go if it is no longer over the list.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const m = lastMouse.current;
        const el = list.current;
        if (!canHover.current || !m || !el) return;
        const r = el.getBoundingClientRect();
        if (m.x < r.left || m.x > r.right || m.y < r.top || m.y > r.bottom) {
          onLeaveRef.current();
          return;
        }
        onMoveRef.current({ clientX: m.x, clientY: m.y, target: document.elementFromPoint(m.x, m.y) });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onLeave = () => {
    lastMouse.current = null;
    if (!canHover.current) return;
    const prev = hovered.current;
    hovered.current = -1;
    if (prev >= 0 && BROADCAST[prev].id !== openRef.current) setBars(prev, false);
    transition(-1);
  };

  // Latest handlers, for the scroll listener above.
  useEffect(() => {
    onMoveRef.current = onMove;
    onLeaveRef.current = onLeave;
  });

  // ---------- Open / close ----------
  /** The next opening comes from the automatic Paulistão open (no glide). */
  const autoOpening = useRef(false);
  /** Cancels a pending "glide once the scroll settles" (phones, automatic open). */
  const settleFollow = useRef<(() => void) | null>(null);
  useEffect(() => () => settleFollow.current?.(), []);
  const toggle = (project: BroadcastProject) => {
    setOpenId((current) => (current === project.id ? null : project.id));
    setMounted((m) => (m.has(project.id) ? m : new Set(m).add(project.id)));
  };

  useEffect(() => {
    const prev = openRef.current;
    openRef.current = openId;
    BROADCAST.forEach((p, i) => {
      const wrap = panels.current[i];
      if (!wrap) return;
      const inner = wrap.firstElementChild as HTMLElement | null;
      const isOpen = p.id === openId;
      const wasOpen = p.id === prev;
      if (isOpen === wasOpen) return;
      // Bars: full on the open row (a tab); the old one empties unless hovered.
      setBars(i, isOpen || hovered.current === i);
      if (reduced.current) {
        gsap.set(wrap, { height: isOpen ? "auto" : 0 });
        if (inner) gsap.fromTo(inner, { opacity: isOpen ? 0 : 1 }, { opacity: isOpen ? 1 : 0, duration: 0.3 });
        return;
      }
      // Interruptible: a card reopened while it is still closing (or the other
      // way round) carries on from where it is, never snapping back to 0.
      const timers = glitchTimers.current;
      clearTimeout(timers[i]);
      delete wrap.dataset.glitch;
      if (isOpen) {
        const fromClosed = wrap.offsetHeight < 2;
        // The automatic opening happens while the visitor scrolls: it unfolds
        // gently (soft ease, a plain fade, no glitch flash), so it reads as the
        // page settling instead of a cut. A click keeps the full sting.
        const soft = autoOpening.current;
        const opening = [
          gsap.to(wrap, {
            height: "auto",
            duration: soft ? 1.1 : OPEN_TIME,
            ease: soft ? "power2.out" : EASE_OPEN,
            overwrite: true,
          }),
        ];
        if (!soft) {
          // A short signal glitch as the content comes in, like a camera cut (< 300ms).
          timers[i] = window.setTimeout(() => {
            wrap.dataset.glitch = "";
            timers[i] = window.setTimeout(() => delete wrap.dataset.glitch, GLITCH_MS);
          }, 280);
        }
        if (inner) {
          if (fromClosed) gsap.set(inner, { opacity: 0, y: soft ? 0 : -24 });
          opening.push(
            gsap.to(inner, {
              opacity: 1,
              y: 0,
              duration: soft ? 0.9 : OPEN_TIME,
              delay: fromClosed ? (soft ? 0.15 : 0.2) : 0,
              ease: soft ? "power1.out" : EASE_OPEN,
              overwrite: true,
            }),
          );
        }
        lagSafe(...opening);
      } else {
        // Closing runs faster than opening (fast closing: the visitor is done with it).
        // The page shrinks without a scroll event: re-check the rows' reveal every
        // frame of the collapse, or the rows below stay hidden.
        gsap.to(wrap, {
          height: 0,
          duration: OPEN_TIME * 0.55,
          ease: EASE_OPEN,
          overwrite: true,
          onUpdate: requestScrollFrame,
          onComplete: () => {
            (window as unknown as { lenis?: { resize: () => void } }).lenis?.resize();
            requestScrollFrame();
          },
        });
        if (inner) gsap.to(inner, { opacity: 0, duration: 0.18, overwrite: true });
      }
    });
    // The card never sits over the open row.
    transition(targetFor(hovered.current));

    // Opening a card: glide so the clicked row's centre lands at FOCUS_AT of
    // the screen. The previous card (above or below) closes with its own
    // animation at the same time; the glide re-reads the row's position every
    // frame, so a card collapsing above it is followed smoothly and the row
    // still lands exactly in place (no instant collapse, no jump).
    // The automatic opening (Paulistão at 35%) does not glide: the visitor is
    // scrolling right then, and a scripted scroll on top of their momentum made
    // the page flicker. The row is already near the focus line anyway.
    // Phones: the finger's momentum carried the row past the screen, so there
    // the automatic opening glides too, but only once the scroll has settled
    // (no finger on the screen, no scroll for a moment).
    settleFollow.current?.();
    settleFollow.current = null;
    const openIdx = openId ? BROADCAST.findIndex((p) => p.id === openId) : -1;
    const row = openIdx >= 0 ? rows.current[openIdx] : null;
    if (row && !autoOpening.current) followScroll(row, FOCUS_AT, OPEN_TIME, "bcOpen");
    else if (row && isTouchLayout()) settleFollow.current = followWhenSettled(row, panels.current[openIdx] ?? null);
    autoOpening.current = false;
  }, [openId, setBars, targetFor, transition]);

  // Paulistão (first card) opens by itself the first time its row reaches 10%
  // of the screen from the top. Only once per visit; the others need a click.
  const autoOpened = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      if (autoOpened.current) return;
      const i = BROADCAST.findIndex((p) => p.id === "paulistao");
      const row = rows.current[i];
      if (!row) return;
      const { top, bottom } = row.getBoundingClientRect();
      // Almost leaving the screen: the row is in the top 10% (or just passing it on a fast scroll).
      // Phones open it earlier (25%), while the row is still in front of the
      // visitor, so the finger's momentum doesn't carry it off the screen first.
      const at = isTouchLayout() ? 0.25 : 0.1;
      if (bottom > 0 && top <= window.innerHeight * at) {
        autoOpened.current = true;
        window.removeEventListener("scroll", onScroll);
        if (!openRef.current) {
          autoOpening.current = true;
          setMounted((m) => (m.has("paulistao") ? m : new Set(m).add("paulistao")));
          setOpenId("paulistao");
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

    // Esc closes the open card.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  // Previews only load once the section is near the screen.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Opens the fullscreen player (a file, or a Vimeo video). */
  const play = useCallback((work: Work, origin: HTMLElement) => {
    opener.current = origin;
    setPlaying(work);
  }, []);
  const closePlayer = useCallback(() => {
    setPlaying(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section ref={section} id="broadcast" className={styles.section} aria-labelledby="broadcast-title">
      <h2 id="broadcast-title" className={styles.srOnly}>
        Broadcast
      </h2>
      {/* White strip separating the hero from the rest of the site. */}
      <div className={styles.marqueeWrap}>
        <Marquee />
        {/* Under the strip, on the right, in the black: "turn off animations"
            above the language switch. */}
        <div className={styles.switches}>
          <MotionSwitch className={styles.motionSwitch} />
          <LangSwitch className={styles.langSwitch} />
        </div>
      </div>

      {/* Giant section title crossing the screen with the scroll. */}
      <ScrollType text="Broadcast" index="01" />

      <div ref={list} className={styles.list} onMouseMove={onMove} onMouseLeave={onLeave}>
        {LIST.map((project, i) => {
          const isOpen = openId === project.id;
          return (
            <Fragment key={project.id}>
              <button
                ref={(node) => {
                  rows.current[i] = node;
                }}
                type="button"
                className={styles.row}
                data-row={i}
                data-align={project.align}
                data-theme={project.id}
                data-thumb={project.preview ? "" : undefined}
                data-open={isOpen || undefined}
                style={{ "--offset": project.offset } as React.CSSProperties}
                aria-expanded={isOpen}
                aria-controls={`broadcast-card-${project.id}`}
                onClick={() => toggle(project)}
              >
                <RowContent project={project} />
                {/* Open / close mark: red "+" while closed, black "−" while open. */}
                <span className={styles.rowIcon} data-open={isOpen || undefined} aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="16" height="16">
                    <path d={isOpen ? "M3 8h10" : "M3 8h10M8 3v10"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </span>
                {/* Phones: the card's loop on the right of the row (hidden once it's open). */}
                {thumbs && project.preview && (
                  <span className={styles.rowThumb} aria-hidden="true">
                    <video src={project.preview} poster={project.img ?? undefined} muted loop playsInline preload="none" />
                  </span>
                )}
                {/* Scroll entrance: a red slab sweeps in over the row, then pulls away. */}
                <span className={styles.wipe} aria-hidden="true" />
                <span className={styles.bar} data-bar="top" aria-hidden="true">
                  <RowContent project={project} black />
                </span>
                <span className={styles.bar} data-bar="bottom" aria-hidden="true">
                  <RowContent project={project} black />
                </span>
              </button>

              <div
                ref={(node) => {
                  panels.current[i] = node;
                }}
                id={`broadcast-card-${project.id}`}
                className={styles.panelWrap}
                role="region"
                aria-label={project.title}
                hidden={!mounted.has(project.id) ? true : undefined}
              >
                {/* Inner wrapper: fades and slides in while the outer one opens. */}
                <div>
                  {mounted.has(project.id) && (
                    <BroadcastPanel project={project} open={isOpen} near={near} onPlay={play} />
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}

        {/* Preview card that follows the cursor (mouse only). */}
        <div ref={cardPos} className={styles.cardPos} aria-hidden="true">
          <div ref={cardTilt} className={styles.cardTilt}>
            <div ref={flipper} className={styles.flipper}>
              {[0, 1].map((n) => (
                <div
                  key={n}
                  ref={(node) => {
                    faces.current[n] = node;
                  }}
                  className={styles.face}
                  data-face={n === 0 ? "a" : "b"}
                >
                  <video muted loop playsInline preload="none" disablePictureInPicture hidden tabIndex={-1} />
                  <div className={styles.stripes} data-stripes>
                    <span>{t("[ PREVIEW 16:9 ]")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <WorkPlayer work={playing} onClose={closePlayer} origin={opener} />
    </section>
  );
}
