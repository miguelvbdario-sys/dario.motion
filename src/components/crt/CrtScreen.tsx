"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CrtScreen.module.css";

/*
 * Old curved TV over the whole site.
 *
 *  - Bulge: a fixed, click-through layer whose backdrop goes through an SVG
 *    displacement filter (barrel distortion: the picture swells in the middle
 *    and bends towards the edges). Chromium-based browsers render it; others
 *    ignore it and keep the rest of the look.
 *  - Glass: rounded black corners, a vignette and faint scanlines on top.
 */

/** Barrel strength: how far the corners bend (share of half the screen). */
const BULGE = 0.035;
/** The barrel distortion is very heavy for the GPU; kept off for performance. */
const CURVE = false;

/**
 * Displacement map: R/G = horizontal/vertical shift, 0.5 = none. Built at the
 * screen's own size (a small stretched map leaves stair steps on the edges).
 * Returns the map and its scale in px.
 */
function barrelMap(width: number, height: number) {
  const W = Math.max(1, Math.round(width));
  const H = Math.max(1, Math.round(height));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  // Largest shift, in px, sets the filter scale.
  const maxX = BULGE * 2 * (width / 2);
  const maxY = BULGE * 2 * (height / 2);
  const scale = Math.max(maxX, maxY) * 2.1;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = ((i + 0.5) / W) * 2 - 1;
      const v = ((j + 0.5) / H) * 2 - 1;
      const r2 = u * u + v * v;
      // Barrel curve, normalised so even the corners sample inside the screen
      // (sampling past the edge mirrored the page into a "reflection").
      const f = (1 + BULGE * r2) / (1 + BULGE * 2) - 1;
      const dx = u * f * (width / 2);
      const dy = v * f * (height / 2);
      const k = (j * W + i) * 4;
      img.data[k] = Math.round((0.5 + dx / scale) * 255);
      img.data[k + 1] = Math.round((0.5 + dy / scale) * 255);
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { href: canvas.toDataURL("image/png"), scale };
}

/** The rim glow: copies of the screen edge stepping inwards, fading out. */
const RIM = Array.from({ length: 12 }, (_, i) => {
  const k = 4 + i * 2.2; // inset of this copy (viewBox units)
  const x0 = 18 + k, x1 = 982 - k, y0 = 26 + k, y1 = 974 - k;
  return `M${x0} ${y0} Q500 ${-10 + k} ${x1} ${y0} Q${1010 - k} 500 ${x1} ${y1} Q500 ${1010 - k} ${x0} ${y1} Q${-10 + k} 500 ${x0} ${y0}Z`;
});

export default function CrtScreen() {
  const [map, setMap] = useState<{ href: string; scale: number; w: number; h: number } | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (!CURVE) return;
    const build = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setMap({ ...barrelMap(w, h), w, h });
    };
    build();
    const onResize = () => {
      clearTimeout(timer.current);
      timer.current = window.setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <defs>
          {map && (
            <filter
              id="crt-bulge"
              x="0"
              y="0"
              width={map.w}
              height={map.h}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feImage href={map.href} x="0" y="0" width={map.w} height={map.h} preserveAspectRatio="none" result="map" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale={map.scale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          )}
        </defs>
      </svg>

      {/* Bulge off: the full-screen SVG backdrop filter cost ~2/3 of every frame
          (60 → 20 fps even on fast machines). Set CURVE = true to bring it back. */}
      {CURVE && map && <div className={styles.bulge} aria-hidden="true" />}
      {/* Light curve: a static "pillow" screen silhouette (edges bowed out,
          corners tucked in) and a soft glare on the glass. Drawn once by the
          browser, no per-frame cost. Where to tweak: the path below and .glare. */}
      <svg className={styles.shape} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path
          fillRule="evenodd"
          d="M-20 -20H1020V1020H-20Z M18 26 Q500 -10 982 26 Q1010 500 982 974 Q500 1010 18 974 Q-10 500 18 26Z"
        />
        {/* Glass rim: a soft white-to-transparent glow just inside the bowed
            edge (stacked strokes, static vector, no filter), so the curve
            reads on the black sections too. Brighter at the top. */}
        <defs>
          <linearGradient id="crt-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <g className={styles.rim}>
          {RIM.map((d, i) => (
            <path key={i} d={d} style={{ opacity: 0.09 * (1 - i / RIM.length) }} />
          ))}
        </g>
      </svg>
      <div className={styles.glare} aria-hidden="true" />
      <div className={styles.glass} aria-hidden="true" />
    </>
  );
}
