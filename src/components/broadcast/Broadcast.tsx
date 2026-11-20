"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { BROADCAST, type BroadcastProject } from "@/content/broadcast";
import type { Work } from "@/content/works";
import WorkPlayer from "@/components/works/WorkPlayer";
import BroadcastPanel from "./BroadcastPanel";
import styles from "./Broadcast.module.css";

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
      <span className={styles.title}>{project.title}</span>
      <span className={styles.meta}>{project.meta}</span>
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

export default function Broadcast() {
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

      const project = to >= 0 ? BROADCAST[to] : null;

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
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      if (isOpen) {
        gsap.fromTo(wrap, { height: 0 }, { height: "auto", duration: OPEN_TIME, ease: EASE_OPEN, overwrite: true });
        if (inner) {
          gsap.fromTo(inner, { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: OPEN_TIME, delay: 0.2, ease: EASE_OPEN });
        }
      } else {
        gsap.to(wrap, { height: 0, duration: OPEN_TIME * 0.8, ease: EASE_OPEN, overwrite: true });
        if (inner) gsap.to(inner, { opacity: 0, duration: 0.3 });
      }
    });
    // The card never sits over the open row.
    transition(targetFor(hovered.current));

    // Opening a card: scroll to its row. If another open card above it is
    // collapsing, its height is taken off the target so we land on the row
    // (before, the collapse shifted the page and you ended up far below).
    if (openId) {
      const i = BROADCAST.findIndex((p) => p.id === openId);
      const row = rows.current[i];
      if (row) {
        const prevIdx = prev ? BROADCAST.findIndex((p) => p.id === prev) : -1;
        const lenis = (window as unknown as { lenis?: { scrollTo: (t: number, o?: object) => void } }).lenis;
        // An open card ABOVE the new one: close it at once and shift the page by
        // its height in the same frame, so nothing on screen moves; then glide
        // to the new row. (Collapsing it while scrolling made the page bounce.)
        const above = prevIdx >= 0 && prevIdx < i ? panels.current[prevIdx] : null;
        if (above) {
          const h = above.offsetHeight;
          gsap.killTweensOf(above);
          gsap.set(above, { height: 0 });
          const inner = above.firstElementChild as HTMLElement | null;
          if (inner) gsap.set(inner, { opacity: 0 });
          const top = window.scrollY - h;
          if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
          else window.scrollTo(0, top);
        }
        // The clicked row ends up in the middle of the screen.
        const y = row.getBoundingClientRect().top + window.scrollY - (window.innerHeight - row.offsetHeight) / 2;
        if (lenis) lenis.scrollTo(y, { duration: OPEN_TIME });
        else window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  }, [openId, setBars, targetFor, transition]);

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

      <div ref={list} className={styles.list} onMouseMove={onMove} onMouseLeave={onLeave}>
        {BROADCAST.map((project, i) => {
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
                data-open={isOpen || undefined}
                style={{ "--offset": project.offset } as React.CSSProperties}
                aria-expanded={isOpen}
                aria-controls={`broadcast-card-${project.id}`}
                onClick={() => toggle(project)}
              >
                <RowContent project={project} />
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
                    <span>[ PREVIEW 16:9 ]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <WorkPlayer work={playing} onClose={closePlayer} />
    </section>
  );
}
