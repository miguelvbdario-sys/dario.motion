"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Dim level of a word that hasn't lit up yet. */
const DIM = 0.18;

/*
 * Text reveal: the words light up one by one.
 *   mode "scroll"  tied to the scroll while the text crosses the screen (scrub),
 *                  so scrolling back dims them again.
 *   mode "play"    plays once, in time, whenever `play` turns true (used inside
 *                  cards that open instead of scrolling into view).
 * Reduced motion: the text simply shows.
 */
export default function WordReveal({
  text,
  mode = "scroll",
  play = true,
}: {
  text: string;
  mode?: "scroll" | "play";
  play?: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || mode !== "scroll") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = el.querySelectorAll<HTMLElement>("[data-w]");
    const tween = gsap.fromTo(
      words,
      { opacity: DIM },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 85%", end: "bottom 50%", scrub: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(words, { clearProps: "opacity" });
    };
  }, [mode, text]);

  useEffect(() => {
    const el = root.current;
    if (!el || mode !== "play" || !play) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = el.querySelectorAll<HTMLElement>("[data-w]");
    // Whole sentence in about 0.9s however long it is.
    const each = Math.min(0.05, 0.9 / Math.max(1, words.length));
    const tween = gsap.fromTo(
      words,
      { opacity: DIM },
      { opacity: 1, duration: 0.35, ease: "power2.out", stagger: each, delay: 0.3, clearProps: "opacity" },
    );
    return () => {
      tween.kill();
    };
  }, [mode, play, text]);

  const parts = text.split(/(\s+)/);
  return (
    <span ref={root}>
      {parts.map((w, i) =>
        /^\s+$/.test(w) || !w ? (
          w
        ) : (
          <span key={i} data-w>
            {w}
          </span>
        ),
      )}
    </span>
  );
}
