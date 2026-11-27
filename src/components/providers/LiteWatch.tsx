"use client";

import { useEffect } from "react";
import { isLite, startLiteWatch } from "@/lib/lite";

/** ?debug meter: fps over the last second, slowest frame, section in view, lite. */
function startDebugMeter() {
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:2147483646;padding:6px 8px;border-radius:4px;background:rgba(0,0,0,.8);color:#0f0;font:12px/1.35 monospace;pointer-events:none;white-space:pre";
  document.body.appendChild(box);
  let frames: number[] = [];
  let last = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    frames.push(now - last);
    last = now;
    let sum = 0;
    for (let i = frames.length - 1; i >= 0 && sum < 1000; i--) sum += frames[i];
    if (frames.length > 400) frames = frames.slice(-400);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const id = window.setInterval(() => {
    const recent: number[] = [];
    let sum = 0;
    for (let i = frames.length - 1; i >= 0 && sum < 1000; i--) {
      recent.push(frames[i]);
      sum += frames[i];
    }
    const fps = Math.round((recent.length * 1000) / Math.max(sum, 1));
    const worst = Math.round(Math.max(0, ...recent));
    const mid = window.innerHeight / 2;
    const sec = [...document.querySelectorAll<HTMLElement>("section[id]")].find((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    });
    const playing = [...document.querySelectorAll("video")].filter((v) => !v.paused).length;
    box.textContent = `${fps} fps  worst ${worst}ms
${sec?.id ?? "-"}  videos ${playing}  lite ${isLite() ? "ON" : "off"}`;
    box.style.color = fps < 45 ? "#f55" : "#0f0";
  }, 500);
  return () => {
    cancelAnimationFrame(raf);
    clearInterval(id);
    box.remove();
  };
}

/*
 * Site-wide client setup:
 *  - starts the frame-rate watch that can switch weak devices to lite mode
 *    (src/lib/lite.ts);
 *  - muted loops (videos without controls) are decoration: tell every browser
 *    not to offer its own buttons on them (Opera's "pop out" button, picture-
 *    in-picture, casting), including loops added later;
 *  - ?debug in the address: a small corner meter (fps, slowest frame, which
 *    section is on screen, lite on/off) to find where a browser struggles.
 *    Never shown otherwise.
 */
const quiet = (v: HTMLVideoElement) => {
  if (v.controls || v.dataset.quiet) return;
  v.dataset.quiet = "";
  v.disablePictureInPicture = true;
  v.setAttribute("disablepictureinpicture", "");
  v.setAttribute("disableremoteplayback", "");
  v.setAttribute("x-webkit-airplay", "deny");
};

export default function LiteWatch() {
  useEffect(() => {
    startLiteWatch();

    document.querySelectorAll("video").forEach(quiet);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLVideoElement) quiet(n);
          else if (n instanceof Element) n.querySelectorAll("video").forEach(quiet);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const stopMeter = new URLSearchParams(location.search).has("debug") ? startDebugMeter() : null;
    return () => {
      mo.disconnect();
      stopMeter?.();
    };
  }, []);
  return null;
}
