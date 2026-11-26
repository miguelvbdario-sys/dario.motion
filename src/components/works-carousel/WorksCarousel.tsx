"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WORKS, type Work } from "@/content/works";
import { useTr, useT } from "@/lib/i18n";
import WorkPlayer from "@/components/works/WorkPlayer";
import SlotNumber from "@/components/effects/SlotNumber";
import styles from "./WorksCarousel.module.css";

/*
 * Concave carousel: a wall of video panels that curves around the viewer,
 * turning slowly and endlessly. An original build, inspired by the "gallery
 * wall" carousel idea (no third-party code).
 *
 * Geometry, per panel, every frame:
 *   rel  = how many panels away from the centre it is (wraps around: endless)
 *   phi  = rel × angle between panels
 *   x    = R·sin(phi)          (sideways along the curve)
 *   z    = R·(1 − cos(phi))    (edges come TOWARD the viewer: concave)
 *   rotateY(−phi)              (every panel faces the centre of the curve)
 * A short CSS perspective then blows the near edges up: the fisheye feel.
 */

/** Enough panels to fill the visible arc; the real pieces repeat. */
const MIN_PANELS = 12;
const PANELS: Work[] = Array.from(
  { length: Math.ceil(MIN_PANELS / WORKS.length) * WORKS.length },
  (_, i) => WORKS[i % WORKS.length],
);
const N = PANELS.length;

// Shape, as multiples of the centre panel's width (read from CSS).
const RADIUS = 2.6; // curve radius: smaller = tighter wall
const PERSPECTIVE = 2.4; // viewer distance: smaller = stronger fisheye
const GAP = 0.04; // space between panels
const MAX_ANGLE = 1.3; // radians either side before a panel is hidden
const DIM = 0.75; // how much the far sides fade out

// Motion.
const DRIFT = 0.1; // panels per second: slow, endless
const BRAKE = 3.5; // how fast the drift stops on hover / restarts after
const FLICK_DECAY = 3; // how fast a flick slows down
const HOVER_MS = 1500; // hover zoom time, kept in sync with the CSS
const FOCUS_ZOOM = 0.20; // centre panel grows 7% while drifting (hover is 50%)
const FOCUS_RATE = 6; // how quickly the auto-focus follows its target

const wrap = (value: number) => {
  let r = (((value % N) + N) % N);
  if (r > N / 2) r -= N;
  return r;
};
const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Hover tilt of a card toward the cursor, max degrees. */
const TILT = 8;

export default function WorksCarousel() {
  const t = useT();
  // Titles and credits in the current language (EN / PT).
  const SHOWN = useTr(PANELS);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const ring = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const captions = useRef<(HTMLDivElement | null)[]>([]);
  const dims = useRef<(HTMLSpanElement | null)[]>([]);

  // Motion state lives in a ref: it changes every frame and must not re-render.
  const motion = useRef({
    offset: 0, // the panel index at the centre (fractional)
    speed: DRIFT,
    flick: 0,
    hovered: -1, // index of the panel under the mouse, or -1
    leftAt: new Array<number>(N).fill(-Infinity), // when the mouse left each panel
    focus: new Array<number>(N).fill(0), // eased 0–1 "this is the centre panel" amount
    dragging: false,
    tweening: false,
    /** Where the current arrow step is heading (so quick clicks add up). */
    target: 0,
  });

  const [active, setActive] = useState(0); // panel at the centre
  const [playing, setPlaying] = useState<Work | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const dragged = useRef(false);

  // ---------- Frame loop: drift, flick, layout, which videos play ----------
  useEffect(() => {
    const el = stage.current;
    const wall = ring.current;
    const section = root.current;
    if (!el || !wall || !section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(hover: none)");
    let width = 0;
    let inView = false;
    let lastActive = -1;
    const isPlaying = new Array<boolean>(N).fill(false);

    const measure = () => {
      // offsetWidth ignores transforms: it is the panel's width set in CSS.
      width = panels.current[0]?.offsetWidth || el.clientWidth * 0.3;
      // Perspective sits on the ring, the panels' direct parent. The ring is
      // "flat" (no preserve-3d), so each panel is drawn in 3D but stacked by
      // z-index: that is what lets a zoomed panel come in front of the others.
      wall.style.perspective = `${width * PERSPECTIVE}px`;
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);

    // Off screen the loop stops entirely and every video pauses.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (!inView) {
          videos.current.forEach((v, i) => {
            v?.pause();
            isPlaying[i] = false;
          });
        }
      },
      { rootMargin: "100px 0px" },
    );
    visibility.observe(section);

    const tick = (_time: number, deltaMs: number) => {
      // Paused while off screen (no drift, no layout, no video work).
      if (!inView) return;
      const m = motion.current;
      const dt = Math.min(deltaMs / 1000, 0.1);

      // Drift eases to a stop while a panel is hovered, and back up after.
      const target = m.hovered >= 0 || m.dragging || reducedMotion ? 0 : DRIFT;
      m.speed += (target - m.speed) * (1 - Math.exp(-dt * BRAKE));
      if (!m.dragging && !m.tweening) {
        m.offset += (m.speed + m.flick) * dt;
        m.flick *= Math.exp(-dt * FLICK_DECAY);
      }

      if (!inView || !width) return;

      const R = width * RADIUS;
      const P = width * PERSPECTIVE;
      const step = (width * (1 + GAP)) / R;
      const centre = ((Math.round(m.offset) % N) + N) % N;
      const now = performance.now();

      for (let i = 0; i < N; i++) {
        const panel = panels.current[i];
        if (!panel) continue;
        const rel = wrap(i - m.offset);
        const phi = rel * step;
        const x = R * Math.sin(phi);
        const z = R * (1 - Math.cos(phi));
        const hidden = Math.abs(phi) > MAX_ANGLE || z > P - width * 0.25;

        // Auto-focus: while the wall drifts, the centre panel lifts its dark
        // overlay and grows a little, in step with its title. The target uses
        // the same smoothstep as the title (ease in and out, no peak), and is
        // eased again per frame so a sudden change (hover) never jumps.
        const focusTarget = m.hovered >= 0 ? 0 : 1 - smoothstep(0.06, 0.42, Math.abs(rel));
        m.focus[i] += (focusTarget - m.focus[i]) * (1 - Math.exp(-dt * FOCUS_RATE));
        const focus = m.focus[i];
        const dim = dims.current[i];
        if (dim) dim.style.opacity = (1 - focus).toFixed(3);

        panel.style.transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${(-phi).toFixed(4)}rad) scale(${(1 + FOCUS_ZOOM * focus).toFixed(4)})`;
        panel.style.opacity = hidden ? "0" : String(1 - DIM * smoothstep(0.25, MAX_ANGLE, Math.abs(phi)));
        panel.style.visibility = hidden ? "hidden" : "visible";
        // Closest to the centre on top. The hovered panel jumps in front of
        // everything and stays there until its 1.5s zoom-out has finished.
        // The hovered one always wins; a panel still shrinking after the mouse
        // left sits just under it (the most recently left on top).
        const sinceLeft = now - m.leftAt[i];
        panel.style.zIndex = String(
          m.hovered === i
            ? 3000
            : sinceLeft < HOVER_MS
              ? 2000 - Math.round(sinceLeft / 10)
              : 100 - Math.round(Math.abs(rel) * 10),
        );
        panel.toggleAttribute("data-centre", i === centre);

        // The caption rides with its panel and only shows near the centre:
        // it fades out as the panel turns away.
        const caption = captions.current[i];
        // While a panel is hovered, only its title shows, wherever it is on
        // the wall. Otherwise the centre panel's title shows.
        if (caption) {
          const show = m.hovered >= 0 ? (m.hovered === i ? 1 : 0) : 1 - smoothstep(0.06, 0.42, Math.abs(rel));
          caption.style.opacity = String(show);
        }

        // Desktop plays the panels in view; phones only the centre one.
        const shouldPlay = !hidden && !reducedMotion && (touch.matches ? i === centre : Math.abs(rel) < 2.6);
        if (shouldPlay !== isPlaying[i]) {
          isPlaying[i] = shouldPlay;
          const video = videos.current[i];
          if (video) {
            if (shouldPlay) {
              if (!video.getAttribute("src")) video.src = PANELS[i].preview;
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          }
        }
      }

      if (centre !== lastActive) {
        lastActive = centre;
        setActive(centre);
      }
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);

  // ---------- Arrows ----------
  const turn = useCallback((direction: 1 | -1) => {
    const m = motion.current;
    m.flick = 0;
    // A click during a step goes one further from that step's target.
    const target = (m.tweening ? m.target : Math.round(m.offset)) + direction;
    m.target = target;
    m.tweening = true;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(m, {
      offset: target,
      duration: still ? 0 : 0.9,
      ease: "power3.inOut",
      overwrite: true,
      onComplete: () => {
        m.tweening = false;
      },
    });
  }, []);

  // ---------- Drag / swipe (horizontal only; vertical swipes still scroll) ----------
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const m = motion.current;
    let startX = 0;
    let startY = 0;
    let startOffset = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let pointerId = -1;
    let decided = false;

    const panelPx = () => (panels.current[0]?.offsetWidth || 400) * (1 + GAP);

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startOffset = m.offset;
      lastT = performance.now();
      velocity = 0;
      decided = false;
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        decided = true;
        if (Math.abs(dy) > Math.abs(dx)) {
          pointerId = -1; // a vertical swipe: let the page scroll
          return;
        }
        dragged.current = true;
        m.dragging = true;
        m.tweening = false;
        gsap.killTweensOf(m);
        el.setPointerCapture(e.pointerId);
      }
      if (!m.dragging) return;
      const now = performance.now();
      const px = panelPx();
      m.offset = startOffset - dx / px;
      const dtMs = Math.max(now - lastT, 1);
      velocity = (-(e.clientX - lastX) / px / dtMs) * 1000;
      lastX = e.clientX;
      lastT = now;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      if (m.dragging) {
        m.dragging = false;
        m.flick = Math.max(-6, Math.min(6, velocity));
      }
    };
    // A drag must not also count as a click on the panel under the pointer.
    const click = (e: MouseEvent) => {
      if (dragged.current) {
        e.stopPropagation();
        e.preventDefault();
        dragged.current = false;
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
    };
  }, []);

  const open = useCallback((work: Work, origin: HTMLElement) => {
    opener.current = origin;
    setPlaying(work);
  }, []);
  const close = useCallback(() => {
    setPlaying(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  const realIndex = (active % WORKS.length) + 1;

  // Hover tilt (mouse): the card leans toward the cursor, up to TILT degrees.
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    if (e.target !== el && !(e.target instanceof HTMLVideoElement)) return;
    const nx = e.nativeEvent.offsetX / el.offsetWidth - 0.5;
    const ny = e.nativeEvent.offsetY / el.offsetHeight - 0.5;
    // One rotation around the axis perpendicular to the cursor offset (the CSS `rotate`
    // property, so it never fights the zoom on `transform`).
    const deg = Math.min(1, Math.hypot(nx, ny) * 2) * TILT;
    el.style.rotate = `${(-ny).toFixed(3)} ${nx.toFixed(3)} 0 ${deg.toFixed(2)}deg`;
  };
  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.rotate = "";
  };

  return (
    <section ref={root} id="works-carousel" className={styles.section} aria-labelledby="works-carousel-title">
      {/* The visible title is the giant "MORE WORKS" above the section. */}
      <h2 id="works-carousel-title" className={styles.srOnly}>
        {t("More works")}
      </h2>

      <div ref={stage} className={styles.stage}>
        <div ref={ring} className={styles.ring}>
          {SHOWN.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              ref={(node) => {
                panels.current[i] = node;
              }}
              className={styles.panel}
              data-scramble-group
              // Mouse events (not pointer events) so every mouse and trackpad
              // fires them; touch screens are filtered out by the hover query.
              onMouseEnter={() => {
                if (window.matchMedia("(hover: hover)").matches) motion.current.hovered = i;
              }}
              onMouseLeave={() => {
                const m = motion.current;
                if (m.hovered === i) m.hovered = -1;
                m.leftAt[i] = performance.now();
              }}
            >
              <button
                type="button"
                className={styles.card}
                onClick={(e) => open(item, e.currentTarget)}
                aria-label={`Play ${item.title}`}
                data-cursor="view"
                onPointerMove={tilt}
                onPointerLeave={untilt}
              >
                <video
                  ref={(node) => {
                    videos.current[i] = node;
                    if (node) {
                      node.muted = true;
                      node.defaultMuted = true;
                    }
                  }}
                  className={styles.media}
                  poster={item.poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  disablePictureInPicture
                  aria-hidden="true"
                  tabIndex={-1}
                />
                {/* The outer layer fades with the auto-focus (JS); the inner one
                    with hover (CSS). Their opacities multiply. */}
                <span
                  ref={(node) => {
                    dims.current[i] = node;
                  }}
                  className={styles.dim}
                  aria-hidden="true"
                >
                  <span className={styles.shade} />
                </span>
              </button>
              <div
                ref={(node) => {
                  captions.current[i] = node;
                }}
                className={styles.caption}
                aria-hidden="true"
              >
                <p className={styles.title}>{item.title}</p>
                {item.meta && <p className={styles.meta} data-scramble>{item.meta}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        {/* Announces the centred piece to screen readers. */}
        <p className={styles.srOnly} aria-live="polite">
          {SHOWN[active].title}
        </p>

        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => turn(-1)} aria-label="Previous work">
            <ChevronLeft aria-hidden="true" strokeWidth={1.25} />
          </button>
          <span className={styles.counter} aria-hidden="true">
            {/* Current number rolls like a slot machine when it changes. */}
            <SlotNumber value={realIndex} /> <span className={styles.counterSep}>/</span>{" "}
            {String(WORKS.length).padStart(2, "0")}
          </span>
          <button type="button" className={styles.arrow} onClick={() => turn(1)} aria-label="Next work">
            <ChevronRight aria-hidden="true" strokeWidth={1.25} />
          </button>
        </div>
      </div>

      <WorkPlayer work={playing} onClose={close} origin={opener} />
    </section>
  );
}
