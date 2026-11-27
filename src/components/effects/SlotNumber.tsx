"use client";

import { useEffect, useRef } from "react";
import styles from "./SlotNumber.module.css";
import { reducedMotion } from "@/lib/motion";

/*
 * Number that rolls like a slot machine when it changes: each digit is a reel
 * that spins a full lap plus the difference, digits stopping one after the
 * other (STAGGER). Reduced motion: it just switches.
 */
const DIGITS = 10;
const LAPS = 1;
const SPIN_MS = 700;
const STAGGER = 70;

function Reel({ digit, order }: { digit: number; order: number }) {
  const reel = useRef<HTMLSpanElement>(null);
  const pos = useRef(DIGITS + digit); // middle block of three
  const shown = useRef(digit);

  useEffect(() => {
    const el = reel.current;
    if (!el || digit === shown.current) return;
    const still = reducedMotion();
    const step = ((digit - shown.current + DIGITS) % DIGITS) + (still ? 0 : LAPS * DIGITS);
    shown.current = digit;
    pos.current += step;
    el.style.transition = still
      ? "none"
      : `transform ${SPIN_MS}ms cubic-bezier(0.2, 0.9, 0.25, 1) ${order * STAGGER}ms`;
    el.style.transform = `translateY(${-pos.current}em)`;
    // Once it stops, jump back to the middle block (same digit, invisible).
    const settle = () => {
      el.style.transition = "none";
      pos.current = DIGITS + digit;
      el.style.transform = `translateY(${-pos.current}em)`;
    };
    if (still) settle();
    else el.addEventListener("transitionend", settle, { once: true });
    return () => el.removeEventListener("transitionend", settle);
  }, [digit, order]);

  return (
    <span className={styles.window}>
      <span ref={reel} className={styles.reel} style={{ transform: `translateY(${-pos.current}em)` }}>
        {Array.from({ length: DIGITS * (2 + LAPS) }, (_, i) => (
          <span key={i}>{i % DIGITS}</span>
        ))}
      </span>
    </span>
  );
}

export default function SlotNumber({ value, pad = 2 }: { value: number; pad?: number }) {
  const digits = String(value).padStart(pad, "0").split("").map(Number);
  return (
    <span className={styles.slot}>
      {digits.map((d, i) => (
        <Reel key={i} digit={d} order={i} />
      ))}
    </span>
  );
}
