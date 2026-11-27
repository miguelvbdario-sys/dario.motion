"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame } from "@/components/effects/scrollFx";
import styles from "./BoxReveal.module.css";

/*
 * Box reveal for ABOUT's texts ([data-box] elements, in data-box order).
 *
 * When the text block comes into view (TRIGGER of the screen), every line gets
 * a solid box that comes in a little from the right (SHIFT) while it grows to
 * cover the line, then shrinks back to its right edge, uncovering the text.
 * Lines follow one another (LINE_GAP). Scrolling back below the screen resets
 * it, so it plays again next time.
 *
 * Lines are measured at play time (a Range's line boxes), so they follow the
 * real wrapping at any width. The buttons get one box each.
 */
const TRIGGER = 0.95;
const RESET = 1.02;
const BOX_MS = 760;
const LINE_GAP = 70;
const BLOCK_GAP = 120;
const SHIFT = 40;
/** Buttons: slide distance (px), duration and offset between them (ms). */
const BTN_SHIFT = 60;
const BTN_MS = 700;
const BTN_GAP = 140;

export default function BoxReveal() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lay = layer.current;
    const section = lay?.closest("section");
    if (!lay || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = [...section.querySelectorAll<HTMLElement>("[data-box]")].sort(
      (a, b) => Number(a.dataset.box) - Number(b.dataset.box),
    );
    if (!blocks.length) return;
    const first = blocks[0];
    let state: "hidden" | "played" = "hidden";
    let timers: number[] = [];
    let anims: Animation[] = [];

    const hide = () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      timers = [];
      anims = [];
      lay.replaceChildren();
      blocks.forEach((b) => (b.style.opacity = "0"));
    };

    const lineRects = (el: HTMLElement): DOMRect[] => {
      // Buttons: one box per button.
      if (el.children.length && [...el.children].every((c) => c.tagName === "A")) {
        return [...el.children].map((c) => c.getBoundingClientRect());
      }
      const range = document.createRange();
      range.selectNodeContents(el);
      // Merge fragments that sit on the same line.
      const lines: DOMRect[] = [];
      [...range.getClientRects()].forEach((r) => {
        if (r.width < 1) return;
        const same = lines.find((l) => Math.abs(l.top - r.top) < r.height * 0.5);
        if (same) {
          const left = Math.min(same.left, r.left);
          const right = Math.max(same.right, r.right);
          lines[lines.indexOf(same)] = new DOMRect(left, same.top, right - left, same.height);
        } else lines.push(r);
      });
      return lines;
    };

    const play = () => {
      hide();
      const sr = section.getBoundingClientRect();
      let t = 0;
      blocks.forEach((block) => {
        // Buttons: no box; each slides in from the right with a fade, one after the other.
        const kids = [...block.children] as HTMLElement[];
        if (kids.length && kids.every((c) => c.tagName === "A")) {
          block.style.opacity = "1";
          kids.forEach((k, i) => {
            anims.push(
              k.animate(
                [
                  { opacity: 0, transform: `translateX(${BTN_SHIFT}px)` },
                  { opacity: 1, transform: "translateX(0)" },
                ],
                { duration: BTN_MS, delay: t + i * BTN_GAP, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
              ),
            );
          });
          t += kids.length * BTN_GAP + BLOCK_GAP;
          return;
        }
        const rects = lineRects(block);
        rects.forEach((r, i) => {
          const box = document.createElement("span");
          box.className = styles.box;
          box.style.left = `${r.left - sr.left}px`;
          box.style.top = `${r.top - sr.top}px`;
          box.style.width = `${r.width}px`;
          box.style.height = `${r.height}px`;
          lay.appendChild(box);
          const anim = box.animate(
            [
              { transform: `translateX(${SHIFT}px) scaleX(0)`, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
              { transform: "translateX(0) scaleX(1)", offset: 0.48, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
              { transform: "translateX(0) scaleX(1)", offset: 0.52, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
              { transform: "translateX(0) scaleX(0)" },
            ],
            { duration: BOX_MS, delay: t + i * LINE_GAP, fill: "both" },
          );
          anims.push(anim);
        });
        // The text shows once its last line is covered.
        const showAt = t + Math.max(0, rects.length - 1) * LINE_GAP + BOX_MS * 0.5;
        timers.push(window.setTimeout(() => (block.style.opacity = "1"), showAt));
        t += rects.length * LINE_GAP + BLOCK_GAP;
      });
      // Clear the boxes once everything has played.
      timers.push(window.setTimeout(() => lay.replaceChildren(), t + BOX_MS + 100));
    };

    hide();
    const unsub = onScrollFrame((vh, top: number) => {
      // With the scroll sequence before ABOUT, wait until its red screen has handed over.
      const clear = !document.querySelector("[data-stage]") || section.dataset.handed !== undefined;
      if (state === "hidden" && clear && top < vh * TRIGGER) {
        state = "played";
        play();
      } else if (state === "played" && (!clear || top > vh * RESET)) {
        state = "hidden";
        hide();
      }
    }, () => first.getBoundingClientRect().top);
    return () => {
      unsub();
      hide();
      blocks.forEach((b) => (b.style.opacity = ""));
    };
  }, []);

  return <div ref={layer} className={styles.layer} aria-hidden="true" />;
}
