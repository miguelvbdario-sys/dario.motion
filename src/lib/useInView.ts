"use client";

import { useEffect, useState } from "react";

/*
 * useInView(ref): true while the element is on screen (or within MARGIN of it).
 *
 * Used by the muted loops: they only play while they can be seen. Off-screen
 * loops kept decoding video for nothing, which made weaker GPUs/phones stutter
 * when a card with many loops was open. One shared IntersectionObserver for all.
 */
const MARGIN = "200px 0px";

type Cb = (visible: boolean) => void;
let observer: IntersectionObserver | null = null;
const callbacks = new Map<Element, Cb>();

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) callbacks.get(e.target)?.(e.isIntersecting);
      },
      { rootMargin: MARGIN },
    );
  }
  return observer;
}

export function useInView(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }
    callbacks.set(el, setVisible);
    getObserver().observe(el);
    return () => {
      callbacks.delete(el);
      observer?.unobserve(el);
    };
  }, [ref]);
  return visible;
}
