"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./CustomCursor.module.css";

/*
 * Custom cursor, ported from "Custom Cursor Effects" Demo 1 by Stefan
 * Kaltenegger for Codrops (https://tympanus.net/codrops/?p=37356).
 *
 * A small dot follows the mouse. What it turns into depends on what it is over:
 *   data-cursor="view"   → 40px ring with a play triangle (playable videos)
 *   data-cursor="drag"   → 40px ring with a "+" (3D emblems)
 *   data-cursor="close"  → ring whose "+" turns into "–", blended (player backdrop)
 *   other links/buttons → soft translucent disc
 * Clicking gives it a little bump. Mouse and trackpad only: touch screens keep
 * their normal behaviour.
 */

type CursorState = "default" | "view" | "drag" | "close" | "link";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const FULL_SIZE = 40;

function stateFor(target: EventTarget | null): CursorState {
  if (!(target instanceof Element)) return "default";
  // The nearest match wins, so a button inside a tagged area still reads as a link.
  const hit = target.closest<HTMLElement>("[data-cursor], a, button, [role='button'], summary, label");
  if (!hit) return "default";
  return (hit.dataset.cursor as CursorState | undefined) ?? "link";
}

export default function CustomCursor() {
  const wrapper = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapper.current;
    const ring = outer.current;
    const cross = inner.current;
    if (!wrap || !ring || !cross) return;

    const mm = gsap.matchMedia();
    mm.add(FINE_POINTER, () => {
      const root = document.documentElement;
      root.classList.add("has-custom-cursor");

      // The player is a modal <dialog>, which sits in the browser's top layer,
      // above every z-index. The cursor is a popover so it can sit in the top
      // layer too, and it is re-raised each time a dialog opens.
      const raise = () => {
        try {
          if (wrap.matches(":popover-open")) wrap.hidePopover();
          wrap.showPopover();
        } catch {
          // Popover API missing: the cursor still works outside the player.
        }
      };
      raise();
      const dialogs = new MutationObserver((records) => {
        if (records.some((r) => r.target instanceof HTMLDialogElement && r.target.open)) raise();
      });
      dialogs.observe(document.body, { subtree: true, attributeFilter: ["open"] });

      const easing = "back.inOut(1.7)";
      const moveX = gsap.quickTo(wrap, "x", { duration: 0.12, ease: "power3.out" });
      const moveY = gsap.quickTo(wrap, "y", { duration: 0.12, ease: "power3.out" });

      const enlarge = gsap.to(ring, {
        backgroundColor: "rgba(239, 238, 238, 0)",
        width: FULL_SIZE,
        height: FULL_SIZE,
        duration: 0.3,
        ease: easing,
        paused: true,
      });
      const linkHover = gsap.to(ring, {
        backgroundColor: "rgba(239, 238, 238, 1)",
        opacity: 0.3,
        width: FULL_SIZE,
        height: FULL_SIZE,
        duration: 0.3,
        ease: easing,
        paused: true,
      });

      let current: CursorState = "default";
      const setState = (next: CursorState) => {
        if (next === current) return;
        current = next;
        const big = next === "view" || next === "drag" || next === "close";
        if (big) {
          linkHover.reverse();
          enlarge.play();
        } else if (next === "link") {
          enlarge.reverse();
          linkHover.play();
        } else {
          enlarge.reverse();
          linkHover.reverse();
        }
        wrap.dataset.state = next;
      };

      let visible = false;
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        if (!visible) {
          // First move: jump there instead of sliding in from the corner.
          gsap.set(wrap, { x: event.clientX, y: event.clientY });
          gsap.to(wrap, { autoAlpha: 1, duration: 0.2 });
          visible = true;
        }
        moveX(event.clientX);
        moveY(event.clientY);
        // Re-check on every move too: some targets (the 3D models) change
        // their data-cursor while the pointer stays on the same element.
        setState(stateFor(event.target));
      };
      const onOver = (event: PointerEvent) => setState(stateFor(event.target));
      const onLeaveWindow = () => {
        gsap.to(wrap, { autoAlpha: 0, duration: 0.2 });
        visible = false;
      };
      const onDown = () => {
        gsap
          .timeline()
          .to(ring, { scale: 0.7, duration: 0.1 })
          .to(ring, { scale: 1, duration: 0.2, ease: easing });
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("blur", onLeaveWindow);

      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("blur", onLeaveWindow);
        dialogs.disconnect();
        enlarge.kill();
        linkHover.kill();
        root.classList.remove("has-custom-cursor");
        try {
          wrap.hidePopover();
        } catch {}
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={wrapper} className={styles.wrapper} popover="manual" aria-hidden="true">
      <div ref={outer} className={styles.outer}>
        <div ref={inner} className={styles.inner} />
      </div>
    </div>
  );
}
