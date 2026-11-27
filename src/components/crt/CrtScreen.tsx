"use client";

import { useEffect, useRef, useState } from "react";
import { useLite } from "@/lib/lite";
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

/** The rim glow: copies of the screen edge stepping inwards, fading out (viewBox 0–1000 units). */
const RIM_STEPS = 12;
const RIM_INSET = (i: number) => 4 + i * 2.2;

/** The glass's sizes, as CSS lengths (they follow the screen: vmin, clamped). */
const GLASS = {
  radius: "clamp(6px, 1vmin, 12px)",
  edgeBlur: "clamp(18px, 3vmin, 36px)",
  edgeSpread: "clamp(4px, 0.8vmin, 10px)",
  vignetteBlur: "clamp(60px, 14vmin, 180px)",
};

/** Resolve the GLASS lengths to px exactly as CSS does (a hidden probe). */
function glassSizes() {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;width:${GLASS.radius};height:${GLASS.edgeBlur};margin-left:${GLASS.edgeSpread};margin-top:${GLASS.vignetteBlur}`;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {
    radius: parseFloat(cs.width),
    edgeBlur: parseFloat(cs.height),
    edgeSpread: parseFloat(cs.marginLeft),
    vignetteBlur: parseFloat(cs.marginTop),
  };
  probe.remove();
  return out;
}

/**
 * The whole CRT glass drawn ONCE into a single canvas (redrawn only when the
 * screen size changes). It used to be three full-screen layers (an SVG edge,
 * a glare and a glass with big box-shadows and scanlines); Safari re-blended
 * all three on every frame anything moved under them. The drawing reproduces
 * them in their old paint order:
 *   1. the bowed screen edge: black outside it, plus a faint white rim glow;
 *   2. the glare: brighter upper left, darker towards the edges;
 *   3. the glass: faint scanlines, two inset shadows (vignette and edge),
 *      and black in the rounded corners.
 * Lite mode (src/lib/lite.ts) leaves out the rim, glare and scanlines.
 */
function drawCrt(canvas: HTMLCanvasElement, lite: boolean) {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  if (W < 1 || H < 1) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const sx = canvas.width / W;
  const sy = canvas.height / H;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const X = (v: number) => (v * W) / 1000;
  const Y = (v: number) => (v * H) / 1000;

  /** The bowed screen edge, inset by k viewBox units. */
  const edge = (k: number) => {
    const x0 = 18 + k;
    const x1 = 982 - k;
    const y0 = 26 + k;
    const y1 = 974 - k;
    ctx.moveTo(X(x0), Y(y0));
    ctx.quadraticCurveTo(X(500), Y(-10 + k), X(x1), Y(y0));
    ctx.quadraticCurveTo(X(1010 - k), Y(500), X(x1), Y(y1));
    ctx.quadraticCurveTo(X(500), Y(1010 - k), X(x0), Y(y1));
    ctx.quadraticCurveTo(X(-10 + k), Y(500), X(x0), Y(y0));
    ctx.closePath();
  };

  // 1. Black outside the bowed edge.
  ctx.beginPath();
  ctx.rect(X(-20), Y(-20), X(1040), Y(1040));
  edge(0);
  ctx.fillStyle = "#000";
  ctx.fill("evenodd");

  if (!lite) {
    // Rim glow: 3px strokes, white fading down each copy's own height.
    ctx.lineWidth = 3;
    ctx.miterLimit = 4;
    for (let i = 0; i < RIM_STEPS; i++) {
      const k = RIM_INSET(i);
      // The curve's own top and bottom (the gradient spans its bounding box).
      const g = ctx.createLinearGradient(0, Y(8 + k), 0, Y(992 - k));
      g.addColorStop(0, "rgba(255, 255, 255, 1)");
      g.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
      g.addColorStop(1, "rgba(255, 255, 255, 0.7)");
      ctx.globalAlpha = 0.09 * (1 - i / RIM_STEPS);
      ctx.strokeStyle = g;
      ctx.beginPath();
      edge(k);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 2. Glare: the darker edges first, the bright spot on top.
    const ellipse = (cx: number, cy: number, rx: number, ry: number, stops: [number, string][]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      for (const [at, color] of stops) g.addColorStop(at, color);
      ctx.fillStyle = g;
      ctx.fillRect(-cx / rx, -cy / ry, W / rx, H / ry);
      ctx.restore();
    };
    ellipse(W * 0.5, H * 0.5, W * 0.7, H * 0.6, [
      [0.55, "rgba(0, 0, 0, 0)"],
      [1, "rgba(0, 0, 0, 0.28)"],
    ]);
    ellipse(W * 0.28, H * 0.18, W * 0.6, H * 0.45, [
      [0, "rgba(255, 255, 255, 0.11)"],
      [0.7, "rgba(255, 255, 255, 0)"],
    ]);
  }

  // 3. The glass, inside its rounded corners.
  const glass = glassSizes();
  const r = glass.radius;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, r);
  ctx.clip();
  if (!lite) {
    // Scanlines: 1px of 10% black every 3px, from the top.
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }
  /** An inset box-shadow: everything outside the shrunk rounded box, blurred. */
  const inset = (blur: number, spread: number, color: string) => {
    // Only the shadow is wanted: the shape is drawn far off to the left and
    // its shadow shifted back (shadow offset and blur are in canvas pixels).
    const away = W * 3;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * sx;
    ctx.shadowOffsetX = away * sx;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.rect(-away - W, -H, W * 3, H * 3);
    ctx.roundRect(-away + spread, spread, W - spread * 2, H - spread * 2, Math.max(0, r - spread));
    ctx.fillStyle = "#000";
    ctx.fill("evenodd");
    ctx.restore();
  };
  // CSS paints the first listed shadow on top: the vignette goes first.
  inset(glass.vignetteBlur, 0, "rgba(0, 0, 0, 0.55)");
  inset(glass.edgeBlur, glass.edgeSpread, "#000");
  ctx.restore();

  // Black in the rounded corners (the old 60px outer spread).
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.roundRect(0, 0, W, H, r);
  ctx.fillStyle = "#000";
  ctx.fill("evenodd");
}

export default function CrtScreen() {
  const [map, setMap] = useState<{ href: string; scale: number; w: number; h: number } | null>(null);
  const timer = useRef(0);
  const glassCanvas = useRef<HTMLCanvasElement>(null);
  const lite = useLite();

  // Draw the glass now, and again whenever the screen size, its pixel
  // density or lite mode changes. Nothing is redrawn while scrolling.
  useEffect(() => {
    const canvas = glassCanvas.current;
    if (!canvas) return;
    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => drawCrt(canvas, lite));
    };
    drawCrt(canvas, lite);
    const ro = new ResizeObserver(redraw);
    ro.observe(canvas);
    const dpr = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dpr.addEventListener("change", redraw);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      dpr.removeEventListener("change", redraw);
    };
  }, [lite]);

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
      {/* The glass: edge, rim, glare, scanlines and shadows, drawn once (drawCrt). */}
      <canvas ref={glassCanvas} data-crt className={styles.glass} aria-hidden="true" />
    </>
  );
}
