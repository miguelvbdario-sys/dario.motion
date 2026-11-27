"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { reducedMotion, useCalm } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);
// Phones resize the viewport every time the address bar shows or hides.
// Recalculating pins on each of those would make pinned sections jump.
ScrollTrigger.config({ ignoreMobileResize: true });

/** The effect has run once in this page load (later rebuilds keep the scroll position). */
let started = false;

/**
 * Global Lenis smooth scroll, driven by the GSAP ticker so ScrollTrigger
 * pins/scrubs stay perfectly in sync. Off with reduced motion or "turn off
 * animations" (src/lib/motion.ts); switching it rebuilds or removes Lenis.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const calm = useCalm();
  useEffect(() => {
    const firstRun = !started;
    started = true;
    if (reducedMotion()) return;
    // ?debug&off=smooth: native scrolling, to test a browser without Lenis.
    const params = new URLSearchParams(location.search);
    if (params.has("debug") && (params.get("off") ?? "").split(",").includes("smooth")) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Start at the top on every load (Lenis keeps its own copy of the scroll
    // position, so set it here too, not only on the window). Not when Lenis is
    // rebuilt after "turn off animations" is switched back off mid-visit.
    if (firstRun && !location.hash) lenis.scrollTo(0, { immediate: true, force: true });

        // Expose for anchor navigation (e.g. lenis.scrollTo("#works"))
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete (window as unknown as { lenis?: Lenis }).lenis;
    };
  }, [calm]);

  return <>{children}</>;
}
