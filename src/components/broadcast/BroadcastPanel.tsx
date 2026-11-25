"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Play } from "lucide-react";
import type { BroadcastProject } from "@/content/broadcast";
import type { Work } from "@/content/works";
import Showcase from "./Showcase";
import Marked, { Mark, splitMarks } from "@/components/effects/Marked";
import BroadcastScoreboard from "./BroadcastScoreboard";
import BroadcastShields from "./BroadcastShields";
import BroadcastMascots from "./BroadcastMascots";
import BroadcastProcess from "./BroadcastProcess";
import { PAULISTAO_ASSETS, PAULISTAO_ASSET_COUNT } from "@/content/paulistaoAssets";
import { FOCUS_AT } from "./focus";
import WordReveal from "@/components/effects/WordReveal";
import styles from "./Broadcast.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** Phones: length of the slide between two screens (ms; keep in sync with the CSS). */
const COMPACT_QUERY = "(max-width: 767px), (max-aspect-ratio: 3/4)";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Accordion body (phones): unfolds from 0 to its height when it mounts and
 * folds back to 0 when `closing` turns on, then calls onClosed.
 */
function AccBody({ closing, onClosed, children }: { closing: boolean; onClosed: () => void; children: React.ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!el.current || reducedMotion()) return;
    gsap.fromTo(
      el.current,
      { height: 0, opacity: 0 },
      { height: "auto", opacity: 1, duration: 0.45, ease: "power3.out", clearProps: "height,opacity" },
    );
  }, []);
  useEffect(() => {
    if (!closing || !el.current) return;
    if (reducedMotion()) {
      onClosed();
      return;
    }
    gsap.to(el.current, { height: 0, opacity: 0, duration: 0.24, ease: "power3.in", onComplete: onClosed });
  }, [closing, onClosed]);
  return (
    <div ref={el} className={styles.accBody}>
      {children}
    </div>
  );
}

/** True on phones / portrait tablets (same query as the hero and the CSS). */
function useCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return compact;
}

/** Striped stand-in for a missing 16:9 media. */
function Placeholder169({ label = "[ PREVIEW 16:9 ]" }: { label?: string }) {
  return (
    <div className={styles.stripes}>
      <span>{label}</span>
    </div>
  );
}

/** A muted loop that only plays while its card is open and near the screen. */
function Loop({ src, poster, active }: { src: string; poster?: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Reduced motion: loops stay on their first frame / poster.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && !reduced) v.play().catch(() => {});
    else v.pause();
  }, [active]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-hidden="true"
    />
  );
}

/** Gap between two screens while they slide (px), like a music player's covers. */
const SWIPE_GAP = 16;

/**
 * Phones: Broadcast Screens as a swipe carousel. The track (previous, current,
 * next) follows the finger; on release it glides to the next screen when the
 * swipe passed 20% of the width (or was a quick flick), otherwise it springs
 * back. The title sits right under the screen, then the arrows.
 */
function ScreenSwipe({
  screens,
  index,
  onChange,
  live,
  assets,
  extras,
}: {
  screens: { label: string; video: string | null; assets?: boolean }[];
  index: number;
  onChange: (i: number) => void;
  live: boolean;
  assets: React.ReactNode;
  /** The screen's live examples: always between the screen and its title. */
  extras?: React.ReactNode;
}) {
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const n = screens.length;
  const wrap = (i: number) => (i + n) % n;
  const [moving, setMoving] = useState(false);
  const busy = useRef(false);
  const drag = useRef<{ x: number; y: number; x0: number; t: number; lock: "x" | "y" | null; id: number } | null>(null);

  // New screen in place: the track goes back to the centre without animating,
  // and the title under it swaps in.
  useLayoutEffect(() => {
    if (track.current) gsap.set(track.current, { x: 0 });
    busy.current = false;
    if (title.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(title.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    }
  }, [index]);

  const step = (d: 1 | -1) => {
    const el = track.current;
    const w = view.current?.offsetWidth ?? 0;
    if (!el || !w || busy.current) return;
    if (reducedMotion()) {
      onChange(wrap(index + d));
      return;
    }
    busy.current = true;
    setMoving(true);
    gsap.to(el, {
      x: -d * (w + SWIPE_GAP),
      duration: 0.38,
      ease: "power3.out",
      overwrite: true,
      onComplete: () => {
        setMoving(false);
        onChange(wrap(index + d));
      },
    });
  };

  const onDown = (e: React.PointerEvent) => {
    if (busy.current || !track.current) return;
    gsap.killTweensOf(track.current);
    const x0 = Number(gsap.getProperty(track.current, "x")) || 0;
    drag.current = { x: e.clientX, y: e.clientY, x0, t: performance.now(), lock: null, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.lock) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.lock === "x") {
        setMoving(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // Pointer already gone.
        }
      }
    }
    if (d.lock === "x" && track.current) gsap.set(track.current, { x: d.x0 + dx });
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.lock !== "x" || !track.current) return;
    const w = view.current?.offsetWidth ?? 1;
    const dx = d.x0 + e.clientX - d.x;
    const v = (e.clientX - d.x) / Math.max(1, performance.now() - d.t); // px per ms
    if (Math.abs(dx) > w * 0.2 || Math.abs(v) > 0.5) step(dx < 0 ? 1 : -1);
    else gsap.to(track.current, { x: 0, duration: 0.3, ease: "power3.out", overwrite: true, onComplete: () => setMoving(false) });
  };

  const slide = (i: number, offset: number) => {
    const sc = screens[i];
    const center = offset === 0;
    return (
      <div
        key={n > 2 ? i : `${i}-${offset}`}
        className={styles.swipeSlide}
        style={{ left: `calc(${offset * 100}% + ${offset * SWIPE_GAP}px)` }}
        aria-hidden={!center || undefined}
      >
        {sc.assets ? (
          center ? (
            assets
          ) : (
            <div className={styles.swipeAssetsCard}>All assets &gt;</div>
          )
        ) : sc.video ? (
          // Neighbours show their first frame (#t) and only play while sliding.
          <Loop src={`${sc.video}#t=0.1`} active={live && (center || moving)} />
        ) : (
          <Placeholder169 />
        )}
      </div>
    );
  };

  return (
    <div className={styles.swipe}>
      <div
        ref={view}
        className={styles.swipeView}
        data-assets={screens[index]?.assets || undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div ref={track} className={styles.swipeTrack}>
          {n > 1 && slide(wrap(index - 1), -1)}
          {slide(index, 0)}
          {n > 1 && slide(wrap(index + 1), 1)}
        </div>
      </div>
      {extras}
      <div ref={title} className={styles.swipeMeta} aria-live="polite">
        <p className={styles.swipeTitle}>{screens[index]?.label}</p>
        <p className={styles.swipeSub}>
          Broadcast screen · {pad(index + 1)} / {pad(n)}
        </p>
      </div>
      <div className={styles.screenNavRow}>
        <button type="button" className={styles.screenArrow} onClick={() => step(-1)} aria-label="Previous screen">
          ‹
        </button>
        <span className={styles.screenCount}>
          {pad(index + 1)} <span>/</span> {pad(n)}
        </span>
        <button type="button" className={styles.screenArrow} onClick={() => step(1)} aria-label="Next screen">
          ›
        </button>
      </div>
    </div>
  );
}

/**
 * The filter-bar look, used for the tabs, the video selector and the plain
 * filters: dark bar, pills with a small square, a label and a mono count.
 * `tabs` = a tablist (aria-selected); otherwise toggle buttons (aria-pressed).
 */
function PillBar({
  items,
  active,
  onSelect,
  label,
  tabs = false,
}: {
  items: { key: string; label: string; count: string }[];
  active: number;
  onSelect: (i: number) => void;
  label: string;
  tabs?: boolean;
}) {
  return (
    <div className={styles.filters} role={tabs ? "tablist" : "group"} aria-label={label}>
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          role={tabs ? "tab" : undefined}
          className={styles.filter}
          data-active={i === active || undefined}
          aria-selected={tabs ? i === active : undefined}
          aria-pressed={tabs ? undefined : i === active}
          onClick={() => onSelect(i)}
        >
          <span className={styles.square} aria-hidden="true" />
          <span className={styles.filterLabel} data-scramble>{item.label}</span>
          <span className={styles.count}>{item.count}</span>
        </button>
      ))}
    </div>
  );
}

/** The open card: red sheet with guides, labels, title, tabs/filters, media and index. */
export default function BroadcastPanel({
  project,
  open,
  near,
  onPlay,
}: {
  project: BroadcastProject;
  open: boolean;
  near: boolean;
  onPlay: (work: Work, origin: HTMLElement) => void;
}) {
  // Chosen video / filter; -1 = the "About the project" tab (where cards open).
  /** Classic layout (no "About the project" tab): videos tabs + preview beside the Index. */
  const classic = !!project.classic && !project.sections;
  const [active, setActive] = useState(classic ? 0 : -1);
  const [tab, setTab] = useState(0); // chosen section
  /** Tab/screen content; its height change is animated (stretch/shrink). */
  const stack = useRef<HTMLDivElement>(null);
  const stackH = useRef(0);
  const live = open && near;
  const { videos, sections } = project;
  const current = videos?.[active];
  const kind = sections?.[tab]?.kind;
  const screens = sections?.[tab]?.screens;
  const [screen, setScreen] = useState(0);
  const loops = screens ? screens[screen]?.loops : sections?.[tab]?.loops;
  /** Phones/portrait tablets: tabs become a vertical accordion, screens a carousel. */
  const compact = useCompact();
  /** Accordion: the open section can be closed again. */
  const [tabOpen, setTabOpen] = useState(true);
  /** Accordion: the open section is folding closed (kept mounted until done). */
  const [closing, setClosing] = useState(false);
  const finishClose = useCallback(() => {
    setClosing(false);
    setTabOpen(false);
  }, []);
  /** Phones: accordion items, and whether the next open should scroll to it. */
  const accRefs = useRef<(HTMLDivElement | null)[]>([]);
  const accJump = useRef(false);


  // Phones: opening a tab scrolls its header to the middle of the screen (the
  // tab above may have just collapsed, which would otherwise leave you far down).
  useEffect(() => {
    if (!accJump.current) return;
    accJump.current = false;
    const el = accRefs.current[sections ? tab : active];
    if (!el) return;
    requestAnimationFrame(() => {
      // The clicked tab's header lands at FOCUS_AT (35%) of the screen height.
      const head = el.firstElementChild as HTMLElement | null;
      const h = head?.offsetHeight ?? 0;
      const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * FOCUS_AT + h / 2;
      const lenis = (window as unknown as { lenis?: { scrollTo: (t: number, o?: object) => void } }).lenis;
      if (lenis) lenis.scrollTo(y, { duration: 0.7 });
      else window.scrollTo({ top: y, behavior: "auto" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, active]);


  // Switching tab or screen: animate the content from its old height to the new
  // one, so the red card stretches/shrinks instead of jumping.
  const lastTab = useRef(tab);
  useLayoutEffect(() => {
    const el = stack.current;
    const tabChanged = lastTab.current !== tab;
    lastTab.current = tab;
    if (!el) return;
    if (compact && tabChanged) {
      stackH.current = el.offsetHeight;
      return;
    }
    gsap.killTweensOf(el);
    const shown = el.style.height ? el.offsetHeight : stackH.current;
    el.style.height = "";
    const next = el.offsetHeight;
    const prev = shown;
    stackH.current = next;
    if (!prev || Math.abs(prev - next) < 2 || reducedMotion()) return;
    gsap.fromTo(
      el,
      { height: prev, overflow: "hidden" },
      { height: next, duration: 0.5, ease: "power3.inOut", clearProps: "height,overflow" },
    );
  }, [tab, screen]);

  // About: its blocks cascade in (stagger) each time it comes on screen: when
  // the card opens (after the card's own unfold has started) or the tab is picked.
  const aboutRef = useRef<HTMLDivElement>(null);
  const aboutShown = open && (sections ? kind === "about" : active === -1) && (!compact || tabOpen);
  const aboutWasShown = useRef(false);
  useLayoutEffect(() => {
    const el = aboutRef.current;
    const was = aboutWasShown.current;
    aboutWasShown.current = aboutShown;
    if (!el || !aboutShown || was) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = el.querySelectorAll<HTMLElement>(
      `.${styles.aboutLead}, .${styles.aboutPoints} > li, .${styles.aboutStats} > div, .${styles.aboutChannels} > *, .${styles.aboutOutroRow}, .${styles.aboutLoops} > *`,
    );
    // 45ms apart; past the 7th item the rest arrive together (long lists don't make people wait).
    gsap.fromTo(
      items,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "expo.out",
        delay: (i: number) => (open && !was ? 0.25 : 0) + Math.min(i, 7) * 0.045,
        clearProps: "opacity,transform",
        overwrite: true,
      },
    );
  }, [aboutShown, open]);

  /** A player entry carrying this project's Index. */
  const toWork = (w: Pick<Work, "id" | "title" | "video"> & Partial<Work>): Work => ({
    meta: project.title,
    preview: "",
    poster: "",
    hasAudio: true,
    client: project.client,
    role: project.role,
    year: project.year,
    ...w,
  });

  const watch = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (current) {
      onPlay(toWork({ id: `${project.id}-${active}`, title: current.title, video: "", vimeo: current.vimeo }), e.currentTarget);
    } else if (project.fullVideo) {
      onPlay(
        toWork({
          id: project.id,
          title: project.title,
          meta: project.meta,
          preview: project.preview ?? "",
          poster: project.img ?? "",
          video: project.fullVideo,
        }),
        e.currentTarget,
      );
    }
  };

  const index = (
    <div className={styles.index}>
      <p className={styles.indexLabel}>[ Index ]</p>
      <dl className={styles.indexRows}>
        <div>
          <dt data-scramble>Client</dt>
          <dd>{project.client}</dd>
        </div>
        <div>
          <dt data-scramble>Details</dt>
          <dd>{project.role}</dd>
        </div>
        <div>
          <dt data-scramble>Year</dt>
          <dd>{project.year}</dd>
        </div>
        {project.team && (
          <div>
            <dt data-scramble>Team</dt>
            <dd>{project.team}</dd>
          </div>
        )}
      </dl>
      {/* No "Watch full" on tabbed projects (Paulistão): the tabs are the content. */}
      {/* Classic (Paris): no button, the preview itself opens the player. */}
      {!sections && !classic && <button
        type="button"
        className={styles.watch}
        onClick={watch}
        disabled={!current && !project.fullVideo}
        title={current || project.fullVideo ? undefined : "[Full video]"}
      >
        Watch full{current ? ` · ${current.title}` : ""}
      </button>}
    </div>
  );

  /** "About the project": short read + loops + the Index; ends with the invitation. */
  const ab = project.about;
  const boardTab = sections?.findIndex((s) => s.kind === "scoreboard") ?? -1;
  /** Desktop: open the Scoreboard tab and bring the tab content (from its top) into view. */
  const discoverBoard = () => {
    const el = stack.current;
    setTab(boardTab);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.2;
    const lenis = (window as unknown as { lenis?: { scrollTo: (t: number, o?: object) => void } }).lenis;
    if (lenis) lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: "auto" });
  };
  const aboutEl = (
    <div ref={aboutRef} className={styles.about}>
      <div className={styles.aboutMain}>
        {/* "\n" in the lead: a paragraph break on desktop, a plain space on phones. */}
        <p className={styles.aboutLead}>
          {(ab?.lead ?? project.desc).split("\n").map((part, i) => (
            <span key={i} className={styles.aboutLeadPart}>
              {i > 0 && " "}
              {/* Words light up one by one when the About opens. */}
              {splitMarks(part).map((sg, k) =>
                sg.mark ? (
                  <Mark key={k}>
                    <WordReveal text={sg.text} mode="play" play={aboutShown} />
                  </Mark>
                ) : (
                  <WordReveal key={k} text={sg.text} mode="play" play={aboutShown} />
                ),
              )}
            </span>
          ))}
        </p>
        {ab && (
          <ul className={styles.aboutPoints}>
            {ab.points.map((pt) => (
              <li key={pt.title}>
                {pt.loop && (
                  <span className={styles.aboutPointLoop}>
                    <Loop src={pt.loop.src} poster={pt.loop.poster} active={live} />
                  </span>
                )}
                <span className={styles.aboutPointTitle}>{pt.title}</span>
                <span className={styles.aboutPointText}>{pt.text}</span>
              </li>
            ))}
          </ul>
        )}
        {ab?.loops && (
          <div className={styles.aboutLoops}>
            {ab.loops.map((l) => (
              <div key={l.src} className={styles.loopCell}>
                <Loop src={l.src} poster={l.poster} active={live} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.aboutSide}>
        {ab?.stats && (
          <dl className={styles.aboutStats}>
            {ab.stats.map((st) => (
              <div key={st.label}>
                <dd>{st.value}</dd>
                <dt data-scramble>{st.label}</dt>
              </div>
            ))}
          </dl>
        )}
        {!ab?.noIndex && index}
        {ab?.channels && (
          <div className={styles.aboutChannels}>
            <span className={styles.sideLabel}>[ On air ]</span>
            {ab.channels.map((c) => (
              <span key={c} className={styles.processChannel}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      {ab?.outro && (
        <div className={styles.aboutOutroRow}>
          <p className={styles.aboutOutro}>{ab.outro}</p>
          {/* Desktop: jump to the Scoreboard tab (phones show the board right below). */}
          {!compact && boardTab >= 0 && (
            <button type="button" className={styles.aboutCta} onClick={discoverBoard}>
              [ Discover the scoreboard ]
            </button>
          )}
        </div>
      )}
    </div>
  );

  /** "All assets": the whole package list, scrolling inside the 16:9 stage. */
  const assetsList = (
                  <div className={styles.assetsList} data-lenis-prevent>
                    <p className={styles.assetsTitle}>
                      All assets <span aria-hidden="true">&gt;</span>
                      <span className={styles.assetsCount}>[{PAULISTAO_ASSET_COUNT}]</span>
                    </p>
                    {PAULISTAO_ASSETS.map((s) => (
                      <section key={s.title}>
                        <h4 className={styles.assetsSection}>{s.title}</h4>
                        {s.groups.map((g) => (
                          <div key={g.title} className={styles.assetsGroup}>
                            <p className={styles.assetsGroupTitle}>{g.title}</p>
                            {g.items.length > 0 && (
                              <ul>
                                {g.items.map((it) => (
                                  <li key={it.name}>
                                    {it.name}
                                    {it.sub && <span className={styles.assetsSub}> · {it.sub.join(" / ")}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
  );

  const stackEl = sections ? (
        <div ref={stack} className={styles.boardStack}>
          {/* The scoreboard stays mounted (hidden) so its state survives tab
              switches; its frames load the first time the card opens. */}
          {sections.some((s) => s.kind === "scoreboard") && !compact && (
            <div hidden={kind !== "scoreboard"}>
              <BroadcastScoreboard active={open} />
            </div>
          )}
          {kind === "about" && aboutEl}
          {kind === "shields" && <BroadcastShields active={live} />}
          {kind === "mascots" && <BroadcastMascots />}
          {kind === "process" && <BroadcastProcess active={live} />}
          {kind === "youtube" && (
            <div className={styles.preview} data-zoom-soft>
              {live ? (
                <iframe
                  className={styles.previewFrame}
                  src={`https://www.youtube-nocookie.com/embed/${sections?.[tab]?.youtube}?rel=0`}
                  title={`${project.title} · Live`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <Placeholder169 />
              )}
            </div>
          )}
          {kind === "screens" && screens && (
            <div className={styles.shields}>
              {/* Vertical list of screens on the left, the chosen one on the right. */}
              {!compact && <div className={styles.boardSide}>
                <p className={styles.sideLabel}>[ Screens ] Pick a screen</p>
                <div className={styles.screenList} role="radiogroup" aria-label="Broadcast screens">
                  {screens.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      role="radio"
                      aria-checked={i === screen}
                      className={`${styles.filter} ${styles.ctrl} ${styles.screenItem}`}
                      data-active={i === screen || undefined}
                      onClick={() => setScreen(i)}
                    >
                      <span className={styles.square} aria-hidden="true" />
                      <span className={styles.filterLabel} data-scramble>{s.label}</span>
                      <span className={styles.count}>[{pad(i + 1)}]</span>
                    </button>
                  ))}
                </div>
              </div>}
              {compact ? (
                // Phones: swipe carousel (the screen follows the finger), its title right
                // under it, then the arrows, then the live examples.
                <ScreenSwipe
                  screens={screens}
                  index={screen}
                  onChange={setScreen}
                  live={live}
                  assets={assetsList}
                  extras={
                    loops && (
                      <div className={styles.screenLoopsMobile}>
                        {loops.map((base) => (
                          <div key={base} className={styles.loopCell}>
                            <Loop src={`${base}.mp4`} poster={`${base}.jpg`} active={live} />
                          </div>
                        ))}
                      </div>
                    )
                  }
                />
              ) : (
              <div
                className={`${styles.preview} ${styles.screenStage}`}
                data-assets={screens[screen]?.assets || undefined}
              >
                {screens[screen]?.assets ? (
                  assetsList
                ) : screens[screen]?.video ? (
                  <div key={screen} className={styles.slideLayer}>
                    <Loop src={screens[screen].video!} active={live} />
                  </div>
                ) : (
                  <Placeholder169 />
                )}
                {!screens[screen]?.assets && (
                  <span className={styles.previewLabel}>Screen · {screens[screen]?.label}</span>
                )}
              </div>
              )}
            </div>
          )}
          {kind === "showcase" && sections?.[tab]?.loops && (
            <Showcase key={sections[tab].label} loops={sections[tab].loops!} verticals={sections[tab].verticals ?? []} zoom={sections[tab].zoom} note={sections[tab].note} cta={sections[tab].cta} active={live} compact={compact} />
          )}
          {kind === "placeholder" && (
            <div className={styles.preview}>
              <Placeholder169 />
            </div>
          )}
          {/* Live examples. Scoreboard: left of the Index (the only tab with it).
              Screens: under the stage, in the right column. */}
          {loops && kind !== "showcase" && !(compact && kind === "screens") && (
            <div className={kind === "screens" ? styles.screenLoops : styles.loopsFull}>
              <div className={styles.loopsGrid}>
                {loops.map((base) => (
                  <div key={base} className={styles.loopCell}>
                    <Loop src={`${base}.mp4`} poster={`${base}.jpg`} active={live} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
  ) : null;

  const mediaPreview = (
          <div className={styles.preview}>
            {current ? (
              live ? (
                // The chosen video, muted and looping (Vimeo), only while the card is open.
                <iframe
                  key={current.vimeo}
                  className={styles.previewFrame}
                  src={`https://player.vimeo.com/video/${current.vimeo}?autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1`}
                  title={`${current.title} (preview)`}
                  allow="autoplay; picture-in-picture"
                  tabIndex={-1}
                />
              ) : (
                <Placeholder169 />
              )
            ) : project.preview && near ? (
              <Loop src={project.preview} poster={project.img ?? undefined} active={live} />
            ) : (
              <Placeholder169 />
            )}
            {classic && current && (
              // Clicking the video opens it fullscreen (play cursor), over the Vimeo iframe.
              <button
                type="button"
                className={styles.previewHit}
                data-cursor="view"
                aria-label={`Watch ${current.title} fullscreen`}
                onClick={watch}
              />
            )}
            <span className={styles.previewLabel}>
              Preview · Loop{videos && current ? ` · ${pad(active + 1)} / ${pad(videos.length)}` : ""}
            </span>
          </div>
  );

  /** Phones: every card's choices as a vertical accordion (sections, videos or categories). */
  // (Paulistão: the scoreboard is always shown on phones, so it isn't a tab.)
  const accItems = sections
    ? sections.map((x, i) => ({ label: x.label, index: i })).filter((x) => sections[x.index].kind !== "scoreboard")
    : [
        ...(classic ? [] : [{ label: "About the project", index: -1 }]),
        ...(videos
          ? videos.map((v, i) => ({ label: v.title, index: i }))
          : project.filters.map((f, i) => ({ label: f.label, index: i }))),
      ];
  const scoreSection = sections?.find((x) => x.kind === "scoreboard");
  const accActive = sections ? tab : active;
  const scoreboardBlock = scoreSection ? (
    <div className={`${styles.boardStack} ${styles.alwaysBoard}`}>
      <BroadcastScoreboard active={open} />
      {scoreSection.loops && (
        <div className={styles.loopsGrid}>
          {scoreSection.loops.map((base) => (
            <div key={base} className={styles.loopCell}>
              <Loop src={`${base}.mp4`} poster={`${base}.jpg`} active={live} />
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;
  const accBody = sections ? stackEl : active === -1 ? aboutEl : mediaPreview;

  return (
    <div className={styles.panel}>
      <div className={styles.guides} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={styles.labels}>
        <span data-scramble>[ Broadcast ]</span>
        <span data-scramble>{project.meta}</span>
        <span data-scramble>Live</span>
        <span data-scramble>{project.year}</span>
      </div>

      <span className={styles.dot} aria-hidden="true" />
      <h3 className={styles.bigTitle}>{project.title}</h3>
      <p className={styles.desc}>
        <Marked text={project.desc} />
      </p>

      {/* Tabs (sections), the video selector, or plain filters. */}
      {compact ? (
        // Phones: vertical tabs (About first); the Paulistão scoreboard is always
        // on, right after the About tab.
        <>
          {classic && index}
          {accItems ? (
            <div className={styles.accordion}>
              {accItems.map(({ label, index: i }, n) => {
                const isOpen = i === accActive && tabOpen;
                return (
                  <div
                    key={label + i}
                    ref={(n) => {
                      accRefs.current[i] = n;
                    }}
                    className={styles.accItem}
                    data-open={isOpen || undefined}
                  >
                    <button
                      type="button"
                      className={styles.accHeader}
                      aria-expanded={isOpen}
                      onClick={() => {
                        if (closing) return;
                        if (i === accActive && tabOpen) setClosing(true);
                        else {
                          accJump.current = true;
                          if (sections) setTab(i);
                          else setActive(i);
                          setTabOpen(true);
                        }
                      }}
                    >
                      <span className={styles.square} aria-hidden="true" />
                      <span className={styles.filterLabel} data-scramble>{label}</span>
                      <span className={styles.count}>[{pad(n + 1)}]</span>
                      <span className={styles.accChevron} aria-hidden="true">▾</span>
                    </button>
                    {isOpen && (
                      <AccBody key={label + i} closing={closing} onClosed={finishClose}>
                        {accBody}
                      </AccBody>
                    )}
                    {scoreSection && sections?.[i]?.kind === "about" && scoreboardBlock}
                  </div>
                );
              })}
            </div>
          ) : (
            !sections && mediaPreview
          )}
        </>
      ) : sections ? (
        <PillBar
          tabs
          label={`${project.title} sections`}
          items={sections.map((s, i) => ({ key: s.label, label: s.label, count: `[${pad(i + 1)}]` }))}
          active={tab}
          onSelect={setTab}
        />
      ) : (
        <PillBar
          label={`${project.title} tabs`}
          items={[
            ...(classic ? [] : [{ key: "about", label: "About the project", count: "[01]" }]),
            ...(videos
              ? videos.map((v, i) => ({ key: v.vimeo, label: v.title, count: `[${pad(i + (classic ? 1 : 2))}]` }))
              : project.filters.map((f, i) => ({ key: String(i), label: f.label, count: f.count }))),
          ]}
          active={classic ? active : active + 1}
          onSelect={(i) => setActive(classic ? i : i - 1)}
        />
      )}

      {compact ? null : sections ? (
        stackEl
      ) : (
        classic ? (
          <div className={styles.mediaGrid}>
            {mediaPreview}
            {index}
          </div>
        ) : active === -1 ? aboutEl : mediaPreview
      )}

      {/* How it looked live. */}
      {project.onAir && (
        <section className={styles.onAir} aria-label="On air">
          <div className={styles.stripHead}>
            <span>[ On air ] 24h live stream</span>
            <span>{pad(project.onAir.length)} loops</span>
          </div>
          <div className={styles.onAirGrid}>
            {project.onAir.map((m, i) => (
              <div key={m.src} className={styles.onAirTile}>
                {near ? <Loop src={m.src} poster={m.poster} active={live} /> : <Placeholder169 label="" />}
                <span className={styles.previewLabel}>Live {pad(i + 1)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Small extras (program vignettes), with sound in the player. */}
      {project.extras && (
        <section className={styles.extras} aria-label="Programs">
          <div className={styles.stripHead}>
            <span>[ Programs vignettes ]</span>
            <span>Sound on</span>
          </div>
          <div className={styles.extrasGrid}>
            {project.extras.map((x) => (
              <button
                key={x.video}
                type="button"
                className={styles.extra}
                data-cursor="view"
                onClick={(e) => onPlay(toWork({ id: x.video, title: x.title, poster: x.poster, video: x.video }), e.currentTarget)}
                aria-label={`Play ${x.title} (with sound)`}
              >
                <span className={styles.extraThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.poster} alt="" width={640} height={360} loading="lazy" />
                  <Play aria-hidden="true" className={styles.extraPlay} strokeWidth={2.5} />
                </span>
                <span className={styles.extraTitle}>{x.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
