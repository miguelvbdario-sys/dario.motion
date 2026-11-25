"use client";

import { useEffect, useRef } from "react";
import styles from "./Marked.module.css";

/*
 * Text with highlighter marks: write ==words== in the text and those words get
 * a yellow marker that sweeps across them (left → right) when the text comes
 * into view. It plays again each time the text re-enters the screen.
 *
 * splitMarks() is exported for texts rendered by another component (e.g. the
 * WordReveal lead): wrap the marked segments in <Mark>.
 */
export function splitMarks(text: string): { text: string; mark: boolean }[] {
  return text.split("==").map((t, i) => ({ text: t, mark: i % 2 === 1 })).filter((s) => s.text);
}

/** Removes the == markers (plain text: alt, aria, titles). */
export const stripMarks = (text: string) => text.replaceAll("==", "");

export function Mark({ children }: { children: React.ReactNode }) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    const m = el.current;
    if (!m) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      m.dataset.on = "";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) m.dataset.on = "";
        else delete m.dataset.on;
      },
      { threshold: 0.6 },
    );
    io.observe(m);
    return () => io.disconnect();
  }, []);
  return (
    <mark ref={el} className={styles.mark}>
      {children}
    </mark>
  );
}

export default function Marked({ text }: { text: string }) {
  return (
    <>
      {splitMarks(text).map((s, i) => (s.mark ? <Mark key={i}>{s.text}</Mark> : <span key={i}>{s.text}</span>))}
    </>
  );
}
