"use client";

import { useEffect, useRef } from "react";
import styles from "./LowerThird.module.css";

/*
 * Section title drawn like a TV lower third: a tag block (optionally "live",
 * with a blinking dot), the title block and a small mono sub block. The blocks
 * wipe in one after the other the first time the title comes on screen.
 */
export default function LowerThird({
  tag,
  title,
  sub,
  live = false,
  align = "left",
  as: Tag = "p",
  id,
}: {
  tag: string;
  title: string;
  sub?: string;
  live?: boolean;
  align?: "left" | "center";
  as?: "p" | "h2";
  id?: string;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.in = "";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.in = "";
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={root as React.RefObject<HTMLHeadingElement & HTMLParagraphElement>}
      id={id}
      className={styles.lt}
      data-align={align}
    >
      <span className={styles.tag} data-live={live || undefined}>
        {live && <span className={styles.dot} aria-hidden="true" />}
        {tag}
      </span>
      <span className={styles.title}>{title}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </Tag>
  );
}
