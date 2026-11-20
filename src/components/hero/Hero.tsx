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
 * Which head sequence the hero uses. TEST: "NOVA SEQUENCIA CABEÇA" (66 frames,
 * in /sequence/hero-test and hero-test-720). Set to "original" to go back.
 * Keep in sync with HEAD_PRELOAD in src/app/page.tsx.
 */
export const HEAD_VARIANT: "original" | "test" = "test";
const HEAD = {
  original: { folder: "hero", last: 85 },
  test: { folder: "hero-test", last: 65 },
}[HEAD_VARIANT];

const HEAD_FRAMES = { first: 0, last: HEAD.last };
const ARROW_FRAMES = { first: 2, last: 85 };
/** Head frame → arrow frame (the arrow keeps its 85 frames whatever the head length). */
const arrowFrame = (f: number) => (f / HEAD.last) * ARROW_FRAMES.last;
/** Scroll distance the hero stays pinned for, relative to the viewport height. */
const PIN_DISTANCE = "+=110%";
/** Drag this many px sideways to run through the whole head animation. */
const DRAG_DISTANCE = 300;
/** How quickly the head rewinds to the scroll frame after a drag (per second). */
const RETURN_RATE = 4.5;

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

      // ---------- Drag the character to scrub its frames ----------
      // A short horizontal drag runs through the whole animation. On release
      // the figure rewinds (or fast-forwards) to the frame that matches the
      // page scroll.
      const view = { scroll: HEAD_FRAMES.first, display: HEAD_FRAMES.first, mode: "scroll" as "scroll" | "drag" | "return" };
      const span = HEAD_FRAMES.last - HEAD_FRAMES.first;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartFrame = 0;
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
        dragStartFrame = view.display;
        if (e.pointerType === "mouse") {
          e.preventDefault(); // no text selection while dragging
          startDrag(e);
        }
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
        // Hover hint: the translucent cursor disc over the character.
        if (e.pointerType === "mouse" && view.mode !== "drag") {
          const hint = !blocked(e.target) && overCharacter(e.clientX, e.clientY);
          if (hint) stage.dataset.cursor = "link";
          else delete stage.dataset.cursor;
        }
        if (e.pointerId === pendingId) {
          // Touch: only a sideways swipe scrubs; a vertical one scrolls the page.
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
        let frame = dragStartFrame + ((e.clientX - dragStartX) / DRAG_DISTANCE) * span;
        // Past either end the figure resists a little instead of stopping dead.
        if (frame > HEAD_FRAMES.last) frame = HEAD_FRAMES.last + (frame - HEAD_FRAMES.last) * 0.15;
        if (frame < HEAD_FRAMES.first) frame = HEAD_FRAMES.first + (frame - HEAD_FRAMES.first) * 0.15;
        view.display = frame;
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerId === pendingId) pendingId = -1;
        if (e.pointerId !== dragId) return;
        dragId = -1;
        view.mode = "return";
        delete stage.dataset.dragging;
      };

      const tickHead = (_t: number, deltaMs: number) => {
        const dt = Math.min(deltaMs / 1000, 0.1);
        if (view.mode === "scroll") view.display = view.scroll;
        else if (view.mode === "return") {
          // Rewind toward the scroll frame: fast at first, settling at the end.
          view.display += (view.scroll - view.display) * (1 - Math.exp(-dt * RETURN_RATE));
          if (Math.abs(view.scroll - view.display) < 0.4) view.mode = "scroll";
        }
        head.draw(Math.min(HEAD_FRAMES.last, Math.max(HEAD_FRAMES.first, view.display)));
      };

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
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onUp);
        head.destroy();
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
