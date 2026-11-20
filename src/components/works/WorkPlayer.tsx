"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import type Lenis from "lenis";
import type { Work } from "@/content/works";
import styles from "./WorkPlayer.module.css";

type WorkPlayerProps = {
  work: Work | null;
  onClose: () => void;
};

const lenis = () => (window as unknown as { lenis?: Lenis }).lenis;

/** Open / close: a quick grow, fast at the start and settling (ease-out both ways). */
const IN = { duration: 0.6, ease: "expo.out" };
const OUT = { duration: 0.42, ease: "expo.out" };

/**
 * Fullscreen player on black, with an Index panel on the right. A native
 * <dialog>: Esc closes it and focus stays inside. Opening and closing grow /
 * shrink the content instead of cutting.
 */
export default function WorkPlayer({ work, onClose }: WorkPlayerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closing = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (work && !el.open) {
      el.showModal();
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
        if (box) gsap.fromTo(box, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, ...IN });
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
    const box = inner.current;
    const done = () => el.close();
    if (reduced.current || !box) {
      gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done });
      return;
    }
    gsap.to(box, { scale: 0.88, opacity: 0, ...OUT });
    gsap.to(el, { opacity: 0, duration: OUT.duration, ease: "power2.out", onComplete: done });
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
