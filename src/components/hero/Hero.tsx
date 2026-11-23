"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FrameSequence } from "@/lib/frameSequence";
import VectorOverlay from "./VectorOverlay";
import { ScanlineField } from "@/lib/scanlineField";
import { ABOUT } from "@/content/about";
import { onLoaded } from "@/lib/loader";
import styles from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js only loads in the browser, after the hero text has painted.
const Emblem = dynamic(() => import("./Emblem"), { ssr: false });

/** Keep in sync with the media query in Hero.module.css and the preloads in page.tsx. */
const COMPACT_QUERY = "(max-width: 767px), (max-aspect-ratio: 3/4)";

/**
 * Head sequence folder (/sequence/hero-look, phones: hero-look-720) and the
 * length of the scroll scrub in playhead steps (also drives the arrow).
 */
const HEAD = { folder: "hero-look", last: 65 };

const HEAD_FRAMES = { first: 0, last: HEAD.last };
const ARROW_FRAMES = { first: 2, last: 85 };
/** Head frame → arrow frame (the arrow keeps its 85 frames whatever the head length). */
const arrowFrame = (f: number) => (f / HEAD.last) * ARROW_FRAMES.last;
/** Scroll distance the hero stays pinned for, relative to the viewport height. */
/**
 * Scroll distance the hero stays pinned for. Desktop: exactly the distance the
 * composition travels (--shift, 430 design px), so when the pin starts the
 * Broadcast list already sits right under the hero. Phones: 60% of the screen.
 */
const PIN_SHIFT = 430;
const pinDistance = () =>
  window.matchMedia(COMPACT_QUERY).matches ? "+=60%" : `+=${Math.round((window.innerWidth / 1920) * PIN_SHIFT)}`;
/** Touch: drag this many px sideways to run from rest to the left end. */
const DRAG_DISTANCE = 200;
/**
 * Desktop mouse zones. PLAY_FPS: playback speed (the sequence's own frame
 * rate).
 */
const PLAY_FPS = 30;
/** Playing back to rest runs this many times faster than PLAY_FPS. */
const RETURN_SPEED = 2.0;
/**
 * Centre (rest) zone = the character's width on screen: its horizontal extent
 * in the rest frame, as fractions of the head canvas (measured 0.247 → 0.771).
 * Lower `from` / higher `to` widens it. top/bottom: its height (touch hit area).
 */
const REST_ZONE = { from: 0.247, to: 0.771, top: 0.157, bottom: 0.69 };
/**
 * "Look" sequence (/sequence/hero-look and hero-look-720): one render, files
 * 000–098 = the source frames 023–121. rest = the rest pose (source frame 72);
 * below it the head turns right, above it the left animation plays.
 */
const LOOK = { last: 98, rest: 49 };

// HUD grid, measured on the wireframe (1920×1080).
const V_LINES = ["15.89%", "38.52%", "61.12%", "83.75%"];
const H_LINES = ["18.19%", "51.81%", "85.42%"];
/** Course: the same link as the "Course page" button in About (falls back to #about while unset). */
const courseHref = ABOUT.buttons.find((b) => b.label === "Course page")?.href ?? "#";
const PILLS = [
  { label: "Projects", href: "#broadcast" },
  { label: "Standalones", href: "#works-carousel" },
  { label: "About me", href: "#about" },
  { label: "Course", href: courseHref === "#" ? "#about" : courseHref },
];

/** In-page links scroll smoothly through Lenis (the hero pin is passed through). */
const goTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  if (!href.startsWith("#")) return;
  const target = document.querySelector(href);
  if (!target) return;
  e.preventDefault();
  const lenis = (window as unknown as { lenis?: { scrollTo: (t: Element, o?: object) => void } }).lenis;
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else target.scrollIntoView({ behavior: "auto" });
};

const pad = (frame: number) => String(frame).padStart(3, "0");
const at = (position: string) => ({ "--at": position }) as CSSProperties;

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const headCanvas = useRef<HTMLCanvasElement>(null);
  const arrowCanvas = useRef<HTMLCanvasElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const headSequence = useRef<FrameSequence | null>(null);
  const scanCanvas = useRef<HTMLCanvasElement>(null);
  const scanlines = useRef<ScanlineField | null>(null);

  // Off screen, the looping CSS animations (breathing core, grain) pause.
  useEffect(() => {
    const stage = root.current;
    if (!stage) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete stage.dataset.offscreen;
      else stage.dataset.offscreen = "";
    });
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  // Background scanlines: drawn on a canvas so the mouse light can bend them.
  useEffect(() => {
    const canvas = scanCanvas.current;
    if (!canvas) return;
    const field = new ScanlineField(canvas);
    scanlines.current = field;
    const resize = new ResizeObserver(() => field.resize());
    resize.observe(canvas);
    return () => {
      resize.disconnect();
      scanlines.current = null;
    };
  }, []);

  useGSAP(
    () => {
      const stage = root.current;
      if (!stage || !headCanvas.current || !arrowCanvas.current) return;

      // Phones get the lighter 720px frames.
      const headFolder = window.matchMedia(COMPACT_QUERY).matches ? `${HEAD.folder}-720` : HEAD.folder;
      const arrow = new FrameSequence({
        canvas: arrowCanvas.current,
        ...ARROW_FRAMES,
        url: (frame) => `/sequence/arrow/SETA_${pad(frame)}.webp`,
      });

      // ---------- The head: one "look" render, left ↔ rest ↔ right ----------
      // /sequence/hero-look: frame LOOK.rest is the rest pose; lower frames turn
      // to look RIGHT, higher frames run the LEFT animation. It is the only
      // sequence on the head canvas (one render, so nothing can jump).
      const look = new FrameSequence({
        canvas: headCanvas.current,
        first: 0,
        last: LOOK.last,
        url: (frame) => `/sequence/${headFolder}/LOOK_${pad(frame)}.webp`,
      });
      headSequence.current = look;
      /** Offset from rest in look frames: < 0 = toward right, > 0 = toward left. */
      let offset = 0;
      /** The part of the offset that comes from scrolling (rest → right end). */
      let scrollOffset = 0;
      const maxRight = LOOK.rest; // frames from rest to the look-right end
      const maxLeft = LOOK.last - LOOK.rest; // frames from rest to the left end

      // ---------- Touch: drag the character ----------
      // Drag LEFT runs the left animation, drag RIGHT the look-right; on
      // release it plays back to rest.
      const view = { mode: "scroll" as "scroll" | "drag" | "return", scroll: HEAD_FRAMES.first };
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartOffset = 0;
      let pendingId = -1;
      let dragId = -1;

      const overCharacter = (x: number, y: number) => {
        const canvas = headCanvas.current;
        if (!canvas) return false;
        const r = canvas.getBoundingClientRect();
        // The character's box in its rest frame (not single pixels: the pixel
        // art has gaps, so a pixel test missed most touches).
        const tx = (x - r.left) / r.width;
        const ty = (y - r.top) / r.height;
        return tx >= REST_ZONE.from && tx <= REST_ZONE.to && ty >= REST_ZONE.top && ty <= REST_ZONE.bottom;
      };
      // Other interactive things sit on top of the character's square canvas.
      // (The stage itself carries data-cursor while hovering the character, so it is excluded.)
      const blocked = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return false;
        const hit = target.closest("[data-vector], [data-cursor], [data-nodrag], button, a");
        return !!hit && hit !== stage;
      };

      const onDown = (e: PointerEvent) => {
        if (e.pointerType === "mouse") return; // the mouse uses the zones, not a drag
        followMouse = false;
        if (e.button !== 0 || blocked(e.target) || !overCharacter(e.clientX, e.clientY)) return;
        pendingId = e.pointerId;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartOffset = offset;
      };
      const startDrag = (e: PointerEvent) => {
        dragId = e.pointerId;
        pendingId = -1;
        view.mode = "drag";
        try {
          stage.setPointerCapture(e.pointerId);
        } catch {
          // Pointer already gone: the drag still works while it stays on the hero.
        }
        stage.dataset.dragging = "";
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerId === pendingId) {
          // Only a sideways swipe scrubs; a vertical one scrolls the page.
          const dx = Math.abs(e.clientX - dragStartX);
          const dy = Math.abs(e.clientY - dragStartY);
          if (dx < 8 && dy < 8) return;
          if (dy > dx) {
            pendingId = -1;
            return;
          }
          startDrag(e);
        }
        if (e.pointerId !== dragId) return;
        // Left drag (negative dx) → toward the left end (positive offset).
        const next = dragStartOffset - ((e.clientX - dragStartX) / DRAG_DISTANCE) * maxLeft;
        offset = Math.max(-maxRight, Math.min(maxLeft, next));
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerId === pendingId) pendingId = -1;
        if (e.pointerId !== dragId) return;
        dragId = -1;
        view.mode = "return";
        delete stage.dataset.dragging;
      };

      // ---------- Desktop: mouse zones (no click) ----------
      // Mouse in the LEFT zone plays the left animation all the way, in the
      // RIGHT zone the look-right all the way, in the centre zone it plays back
      // to rest. Own frame rate forward, RETURN_SPEED× back. Going straight to
      // the other side passes through rest, so it never jumps.
      // Chosen by the pointer actually in use (not the screen size): a mouse,
      // even in a narrow window, uses the zones; a finger uses scroll + drag.
      let followMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      /** Mouse zone: −1 left of the character, 0 over it (or away), 1 right of it. */
      let mouseX = 0;
      const onWindowMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        followMouse = true;
        // −1 left of the character, 0 over it, 1 right of it.
        const r = headCanvas.current?.getBoundingClientRect();
        if (!r) return;
        const t = (e.clientX - r.left) / r.width;
        mouseX = t < REST_ZONE.from ? -1 : t > REST_ZONE.to ? 1 : 0;
      };
      const onWindowLeave = () => (mouseX = 0);
      /** Desktop: the head is on the scroll pose and follows the scroll 1:1. */
      let scrollLocked = true;

      const tickHead = (_t: number, deltaMs: number) => {
        const dt = Math.min(deltaMs / 1000, 0.1);
        const step = dt * PLAY_FPS;
        const back = step * RETURN_SPEED;
        const toward = (target: number) => {
          // Forward (away from rest) at step, back toward rest at `back`.
          const away = Math.abs(target) > Math.abs(offset) && Math.sign(target) === Math.sign(offset || target);
          const s = away ? step : back;
          offset = offset < target ? Math.min(target, offset + s) : Math.max(target, offset - s);
        };
        // Scrolling turns the head from rest to the right end (desktop and phones).
        scrollOffset = -(view.scroll / HEAD_FRAMES.last) * maxRight;
        if (followMouse) {
          // Desktop: the mouse zones win; over the character (or away), the head
          // sits where the scroll puts it.
          const zone = mouseX;
          if (zone !== 0) scrollLocked = false;
          if (scrollLocked) offset = scrollOffset;
          else {
            const target = zone === 1 ? -maxRight : zone === -1 ? maxLeft : scrollOffset;
            // Switching sides: back to rest first (same sign rule as toward()).
            toward(Math.sign(target) !== Math.sign(offset) && offset !== 0 ? 0 : target);
            // Back on the scroll pose: follow the scroll directly again.
            if (zone === 0 && offset === scrollOffset) scrollLocked = true;
          }
        } else {
          // Phones/tablets: a drag moves the head from the scroll pose, and on
          // release it plays back.
          if (view.mode === "scroll") offset = scrollOffset;
          else if (view.mode === "return") {
            toward(scrollOffset);
            if (offset === scrollOffset) view.mode = "scroll";
          }
        }
        look.draw(Math.round(LOOK.rest + Math.max(-maxRight, Math.min(maxLeft, offset))));
      };

      window.addEventListener("pointermove", onWindowMove);
      document.documentElement.addEventListener("mouseleave", onWindowLeave);
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onUp);
      gsap.ticker.add(tickHead);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(stage);

        // Scroll scrub: one playhead drives both sequences, so the arrow and
        // the head always show the same frame number.
        const playhead = { frame: HEAD_FRAMES.first };
        const render = () => {
          // The head follows view (scroll, or a drag); the arrow always follows scroll.
          view.scroll = playhead.frame;
          arrow.draw(Math.round(arrowFrame(playhead.frame)));
        };
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: pinDistance,
              invalidateOnRefresh: true,
              pin: true,
              // No lag: the composition rises at exactly the scroll speed, so it moves
              // together with the Broadcast cards (a lag made one look pushed by the other).
              scrub: true,
              anticipatePin: 1,
            },
          })
          .to(playhead, { frame: HEAD_FRAMES.last, snap: "frame", onUpdate: render }, 0)
          // --p moves the whole composition up; the distance lives in the CSS.
          .to(stage, { "--p": 1 }, 0);

        // Intro, played once the loading screen has lifted.
        const intro = gsap
          .timeline({ paused: true, defaults: { ease: "expo.out" } })
          .fromTo(q("[data-vline]"), { scaleY: 0, opacity: 1 }, { scaleY: 1, duration: 1.6, stagger: 0.07 }, 0)
          .fromTo(q("[data-hline]"), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.6, stagger: 0.07 }, 0.1)
          .fromTo(q("[data-mark]"), { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.025 }, 0.9)
          .fromTo(
            q("[data-word]"),
            { yPercent: 30, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 1.4, stagger: 0.12 },
            0.15,
          )
          .fromTo(q("[data-head]"), { opacity: 0, yPercent: 2.5 }, { opacity: 1, yPercent: 0, duration: 1.6 }, 0.35)
          .fromTo(
            q("[data-reveal]"),
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.07 },
            0.75,
          );
        const stopWaiting = onLoaded(() => intro.play());
        return () => stopWaiting();
      });

      return () => {
        mm.revert();
        gsap.ticker.remove(tickHead);
        stage.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onWindowMove);
        document.documentElement.removeEventListener("mouseleave", onWindowLeave);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onUp);
        look.destroy();
        headSequence.current = null;
        arrow.destroy();
      };
    },
    { scope: root },
  );

  return (
    <section id="hero" ref={root} className={styles.stage}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgCore} />
        <div className={styles.bgFollow} />
        <canvas ref={scanCanvas} className={styles.bgScan} />
      </div>

      <div className={styles.grid} aria-hidden="true">
        {V_LINES.map((x) => (
          <span key={x} className={styles.vline} style={at(x)} data-vline />
        ))}
        {H_LINES.map((y) => (
          <span key={y} className={styles.hline} style={at(y)} data-hline />
        ))}
        {V_LINES.flatMap((x) =>
          H_LINES.map((y) => (
            <span key={`${x}-${y}`} className={styles.cross} style={{ "--x": x, "--y": y } as CSSProperties} data-mark />
          )),
        )}
      </div>

      {/* Everything below travels up together while the hero is pinned. */}
      <div className={styles.scroll}>
        <div className={styles.fade} aria-hidden="true" />

        <div className={styles.comp}>
          <h1 ref={title} className={styles.title} translate="no">
            {/* One span per letter, so the hovered letter can be tinted on its own. */}
            {["Miguel", "Dario"].map((word) => (
              <span key={word} data-word>
                {[...word].map((char, i) => (
                  <span key={i} className={styles.letter}>
                    {char}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <canvas
            ref={headCanvas}
            className={styles.head}
            role="img"
            aria-label="Pixel-art portrait of Miguel Dario that turns as you scroll"
            data-head
          />


          <div className={`${styles.emblem} ${styles.emblemLeft}`} data-reveal data-nodrag>
            <Emblem id="left" src="/3d/emblem-left.glb" label="Chrome 3D pig emblem" speed={0.75} />
          </div>
          <div className={`${styles.emblem} ${styles.emblemRight}`} data-reveal data-nodrag>
            <Emblem id="right" src="/3d/emblem-right.glb" label="Chrome 3D vulture emblem" speed={-0.6} />
          </div>

          {/* Navigation: each pill scrolls to its section (Course opens /course in the same tab). */}
          <nav className={styles.nav} aria-label="Sections">
            {PILLS.map((pill) => {
              const external = pill.href.startsWith("http");
              return (
                <a
                  key={pill.label}
                  href={pill.href}
                  className={styles.pill}
                  data-magnetic
                  data-reveal
                  data-vector
                  data-cursor="link"
                  onClick={(e) => goTo(e, pill.href)}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  {pill.label}
                </a>
              );
            })}
          </nav>
          <canvas ref={arrowCanvas} className={styles.arrow} aria-hidden="true" data-reveal />
        </div>
      </div>

      <div className={styles.grain} aria-hidden="true" />

      <VectorOverlay stage={root} title={title} headCanvas={headCanvas} headSequence={headSequence} scanlines={scanlines} />
    </section>
  );
}
