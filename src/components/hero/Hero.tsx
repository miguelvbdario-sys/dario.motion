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
import styles from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js only loads in the browser, after the hero text has painted.
const Emblem = dynamic(() => import("./Emblem"), { ssr: false });

/** Keep in sync with the media query in Hero.module.css and the preloads in page.tsx. */
const COMPACT_QUERY = "(max-width: 767px), (max-aspect-ratio: 3/4)";

/**
 * Scroll head sequence (66 frames, /sequence/hero-test and hero-test-720).
 * Phones/tablets scrub it with the scroll; desktop keeps it on frame 0 (the
 * mouse zones drive the look sequence instead). Preloads: src/app/page.tsx.
 */
const HEAD = { folder: "hero-test", last: 65 };

const HEAD_FRAMES = { first: 0, last: HEAD.last };
const ARROW_FRAMES = { first: 2, last: 85 };
/** Head frame → arrow frame (the arrow keeps its 85 frames whatever the head length). */
const arrowFrame = (f: number) => (f / HEAD.last) * ARROW_FRAMES.last;
/** Scroll distance the hero stays pinned for, relative to the viewport height. */
const PIN_DISTANCE = "+=110%";
/** Touch: drag this many px sideways to run from rest to the left end. */
const DRAG_DISTANCE = 600;
/**
 * Desktop mouse zones. PLAY_FPS: playback speed (the sequence's own frame
 * rate). FOLLOW_DEAD_ZONE: half-width of the centre (rest) zone, in screen
 * units where −1 = left edge and 1 = right edge.
 */
const PLAY_FPS = 30;
/** Playing back to rest runs this many times faster than PLAY_FPS. */
const RETURN_SPEED = 1.6;
const FOLLOW_DEAD_ZONE = 0.12;
/** Where the centre rest zone sits: −1 = left edge, 0 = middle, 1 = right edge. */
const FOLLOW_CENTER = 0;
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
  else target.scrollIntoView({ behavior: "smooth" });
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
      const head = new FrameSequence({
        canvas: headCanvas.current,
        ...HEAD_FRAMES,
        url: (frame) => `/sequence/${headFolder}/VIDEO-HEAD_${pad(frame)}.webp`,
      });
      headSequence.current = head;
      const arrow = new FrameSequence({
        canvas: arrowCanvas.current,
        ...ARROW_FRAMES,
        url: (frame) => `/sequence/arrow/SETA_${pad(frame)}.webp`,
      });

      // ---------- "Look" sequence: one render, left ↔ rest ↔ right ----------
      // /sequence/hero-look: frame LOOK.rest is the rest pose (= the scroll
      // head's frame 0); lower frames turn to look RIGHT, higher frames run
      // the LEFT animation. It paints the same canvas as the scroll head; the
      // inactive one keeps loading but never paints, so switching can't flash.
      const look = new FrameSequence({
        canvas: headCanvas.current,
        first: 0,
        last: LOOK.last,
        url: (frame) => `/sequence/${headFolder.replace(HEAD.folder, "hero-look")}/LOOK_${pad(frame)}.webp`,
      });
      look.setActive(false);
      /** Which sequence owns the canvas. */
      let onLook = false;
      /** Offset from rest in look frames: < 0 = toward right, > 0 = toward left. */
      let offset = 0;
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
        return head.alphaAt((x - r.left) / r.width, (y - r.top) / r.height) > 60;
      };
      // Other interactive things sit on top of the character's square canvas.
      // (The stage itself carries data-cursor while hovering the character, so it is excluded.)
      const blocked = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return false;
        const hit = target.closest("[data-vector], [data-cursor], button, a");
        return !!hit && hit !== stage;
      };

      const onDown = (e: PointerEvent) => {
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
      const followMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      /** −1 (left edge) … 0 (centre / mouse away) … 1 (right edge). */
      let mouseX = 0;
      const onWindowMove = (e: PointerEvent) => {
        if (e.pointerType === "mouse") mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      };
      const onWindowLeave = () => (mouseX = 0);

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
        if (followMouse) {
          const d = mouseX - FOLLOW_CENTER;
          const zone = d > FOLLOW_DEAD_ZONE ? 1 : d < -FOLLOW_DEAD_ZONE ? -1 : 0;
          const target = zone === 1 ? -maxRight : zone === -1 ? maxLeft : 0;
          // Switching sides: back to rest first (same sign rule as toward()).
          toward(Math.sign(target) !== Math.sign(offset) && offset !== 0 ? 0 : target);
        } else if (view.mode === "return") {
          toward(0);
          if (offset === 0) view.mode = "scroll";
        }

        // Rest → the scroll head; anywhere else → the look sequence.
        const useLook = offset !== 0;
        if (useLook !== onLook) {
          onLook = useLook;
          head.setActive(!useLook);
          look.setActive(useLook);
        }
        if (useLook) look.draw(Math.round(LOOK.rest + offset));
        // Desktop: no scroll scrub on the head (it stays on its rest frame).
        else head.draw(followMouse ? HEAD_FRAMES.first : view.scroll);
      };

      if (followMouse) {
        window.addEventListener("pointermove", onWindowMove);
        document.documentElement.addEventListener("mouseleave", onWindowLeave);
      } else {
        stage.addEventListener("pointerdown", onDown);
      }
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
              end: PIN_DISTANCE,
              pin: true,
              scrub: 0.5,
              anticipatePin: 1,
            },
          })
          .to(playhead, { frame: HEAD_FRAMES.last, snap: "frame", onUpdate: render }, 0)
          // --p moves the whole composition up; the distance lives in the CSS.
          .to(stage, { "--p": 1 }, 0);

        // Intro, played once on load.
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
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
        head.destroy();
        headSequence.current = null;
        arrow.destroy();
        look.destroy();
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
        <p className={styles.handle} data-reveal>
          @dario.motion
        </p>

        <div className={styles.comp}>
          <h1 ref={title} className={styles.title}>
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


          <div className={`${styles.emblem} ${styles.emblemLeft}`} data-reveal>
            <Emblem id="left" src="/3d/emblem-left.gltf" label="Chrome 3D pig emblem" speed={0.75} />
          </div>
          <div className={`${styles.emblem} ${styles.emblemRight}`} data-reveal>
            <Emblem id="right" src="/3d/emblem-right.gltf" label="Chrome 3D vulture emblem" speed={-0.6} />
          </div>

          <p className={`${styles.script} ${styles.senior}`} data-reveal data-vector>
            Senior
          </p>
          <p className={`${styles.script} ${styles.role}`} data-reveal data-vector>
            <span>Motion</span> <span>Designer</span>
          </p>

          {/* Navigation: each pill scrolls to its section (Course opens /course in the same tab). */}
          <nav className={styles.nav} aria-label="Sections">
            {PILLS.map((pill) => {
              const external = pill.href.startsWith("http");
              return (
                <a
                  key={pill.label}
                  href={pill.href}
                  className={styles.pill}
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
