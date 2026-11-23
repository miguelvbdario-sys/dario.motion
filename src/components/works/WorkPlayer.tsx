"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import type Lenis from "lenis";
import type { Work } from "@/content/works";
import { crtOff, playerOn } from "@/lib/sound";
import styles from "./WorkPlayer.module.css";

type WorkPlayerProps = {
  work: Work | null;
  onClose: () => void;
  /** The thumbnail / button that opened it: the player grows out of it and shrinks back into it. */
  origin?: React.RefObject<HTMLElement | null>;
};

const lenis = () => (window as unknown as { lenis?: Lenis }).lenis;

/**
 * Open: grows out of what was clicked, fast then settling (ease-out).
 * Close: about a third of the open, accelerating away (ease-in): the visitor
 * is done with it, so it gets out of the way.
 */
const IN = { duration: 0.55, ease: "expo.out" };
const OUT = { duration: 0.22, ease: "power3.in" };
/** Scale the player starts from / shrinks to when it has an origin. */
const FROM_SCALE = 0.35;

/** transform-origin on the player box that points at the centre of `origin`. */
const originOf = (box: HTMLElement, origin: HTMLElement | null | undefined) => {
  if (!origin || !origin.isConnected) return "50% 50%";
  const b = box.getBoundingClientRect();
  const o = origin.getBoundingClientRect();
  if (!o.width || !b.width) return "50% 50%";
  return `${o.left + o.width / 2 - b.left}px ${o.top + o.height / 2 - b.top}px`;
};

/**
 * Fullscreen player on black, with an Index panel on the right. A native
 * <dialog>: Esc closes it and focus stays inside. Opening and closing grow /
 * shrink the content instead of cutting.
 */
export default function WorkPlayer({ work, onClose, origin }: WorkPlayerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closing = useRef(false);
  const reduced = useRef(false);
  // Latest origin ref, read inside the open/close animations.
  const originRef = useRef(origin);
  useEffect(() => {
    originRef.current = origin;
  });

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (work && !el.open) {
      el.showModal();
      playerOn();
      lenis()?.stop();
      document.documentElement.style.overflow = "hidden";
      // Opened by a click, so the browser allows sound.
      video.current?.play().catch(() => {});
      closing.current = false;
      const box = inner.current;
      if (reduced.current) {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      } else {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
        if (box) {
          const hasOrigin = !!originRef.current?.current?.isConnected;
          gsap.set(box, { transformOrigin: originOf(box, originRef.current?.current) });
          gsap.fromTo(
            box,
            { scale: hasOrigin ? FROM_SCALE : 0.86, opacity: 0 },
            { scale: 1, opacity: 1, ...IN, overwrite: true },
          );
        }
      }
    }
    if (!work && el.open) el.close();
  }, [work]);

  /** Animated close: shrink and fade, then really close the dialog. */
  const close = useCallback(() => {
    const el = dialog.current;
    if (!el || !el.open || closing.current) return;
    closing.current = true;
    video.current?.pause();
    crtOff();
    const box = inner.current;
    // Closing while still opening: the open tweens stop where they are.
    gsap.killTweensOf(el);
    if (box) gsap.killTweensOf(box);
    const done = () => el.close();
    if (reduced.current || !box) {
      gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done });
      return;
    }
    // Back into what opened it (the page may have moved, so measure again).
    const hasOrigin = !!originRef.current?.current?.isConnected;
    gsap.set(box, { transformOrigin: originOf(box, originRef.current?.current) });
    gsap.to(box, { scale: hasOrigin ? FROM_SCALE : 0.9, opacity: 0, ...OUT, overwrite: true });
    gsap.to(el, { opacity: 0, duration: OUT.duration, ease: "power2.in", onComplete: done });
  }, []);

  // Esc: run the animated close instead of the browser's instant one.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [close]);

  // Whatever closed the dialog, clean up the same way.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const handleClose = () => {
      video.current?.pause();
      lenis()?.start();
      document.documentElement.style.overflow = "";
      gsap.set(el, { clearProps: "opacity" });
      closing.current = false;
      onClose();
    };
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      className={styles.player}
      aria-label={work ? work.title : "Video player"}
      data-lenis-prevent
      data-cursor="close"
      onClick={(event) => {
        // A click on the backdrop (not on the video, header or index) closes.
        if (event.target === event.currentTarget) close();
      }}
    >
      {work && (
        <div ref={inner} className={styles.playerInner} data-cursor="default" data-vertical={work.vertical || undefined}>
          <header className={styles.playerHeader}>
            {/* No title/meta over the video: the Index carries the info. Kept
                as a spacer so the close button stays on the right. */}
            <div />
            <button type="button" className={styles.playerClose} onClick={close} aria-label="Close video" autoFocus>
              <X aria-hidden="true" strokeWidth={2.5} />
            </button>
          </header>

          <div className={styles.playerBody}>
            {work.vimeo ? (
              // Hosted on Vimeo: its own player, loaded only while the dialog is open.
              <iframe
                key={work.id}
                className={styles.playerVideo}
                src={`https://player.vimeo.com/video/${work.vimeo}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`}
                title={work.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ border: 0 }}
              />
            ) : (
              <video
                ref={video}
                key={work.id}
                className={styles.playerVideo}
                src={work.video}
                poster={work.poster}
                controls
                playsInline
                preload="auto"
              />
            )}

            {/* Index (credits), when the video has any (works and BROADCAST do;
                course videos don't). Placeholders until they are filled in. */}
            {(work.client || work.role || work.year) && (
            <aside className={styles.playerIndex} aria-label="Index">
              <p className={styles.playerIndexLabel}>[ Index ]</p>
              <dl className={styles.playerIndexRows}>
                <div>
                  <dt>Client</dt>
                  <dd>{work.client ?? "[Client]"}</dd>
                </div>
                <div>
                  <dt>Details</dt>
                  <dd>{work.role ?? "[Details]"}</dd>
                </div>
                <div>
                  <dt>Year</dt>
                  <dd>{work.year ?? "[Year]"}</dd>
                </div>
              </dl>
            </aside>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
