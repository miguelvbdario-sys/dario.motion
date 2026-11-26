"use client";

import { useEffect, useRef, useState } from "react";
import type { Mesh, Object3D } from "three";
import styles from "./Recopando.module.css";
import { Lightbox } from "./Showcase";
import Marked from "@/components/effects/Marked";

import { useT } from "@/lib/i18n";
/** Intro text at the top of the tab (where to change it). */
const INTRO =
  "Recopando replays the most memorable matches from past World Cups. The vignette is all about ==nostalgia==: a typical Brazilian bedroom from the 90s to the 00s, with the CRT TV and the PS2.";

/*
 * RECOPANDO tab (2026 World Cup card): the vignette was made entirely in
 * Blender, so the tab shows it.
 *
 *   1. Render × wireframe: the 00s vignette with its Blender wireframe (same
 *      camera, rendered from the scene) on top; a split line follows the mouse
 *      or the finger. The wireframe video follows the vignette's time.
 *      The other decades play as plain videos (no wireframe).
 *   2. The scene in 3D: the 00s set in material preview the visitor can
 *      rotate (three.js, loaded only when the tab is open).
 *
 * Media in /public/broadcast/recopando.
 */
const BASE = "/broadcast/recopando";
const DECADES = ["00s", "10s", "70s", "80s", "90s"] as const;
type Decade = (typeof DECADES)[number];
/** Only this decade has the wireframe (render + 3D). */
const WIRE: Decade = "00s";
/** 3D start view, relative to the props' size (front, slightly above and to the side). */
const VIEW = { side: 0.15, up: 0.32, back: 0.95, lift: 0.12 };

function Compare({ decade, active }: { decade: Decade; active: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLVideoElement>(null);
  const wire = useRef<HTMLVideoElement>(null);
  const [split, setSplit] = useState(50);
  const hasWire = decade === WIRE;

  // Play/pause with the card; the wireframe video follows the vignette's clock.
  useEffect(() => {
    const m = main.current;
    if (!m) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && !still) m.play().catch(() => {});
    else m.pause();
    const w = wire.current;
    if (!w || !hasWire) return;
    let raf = 0;
    const sync = () => {
      if (Math.abs(w.currentTime - m.currentTime) > 0.08) w.currentTime = m.currentTime;
      if (m.paused !== w.paused) (m.paused ? w.pause() : w.play().catch(() => {}));
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [active, decade, hasWire]);

  const move = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={box}
      className={styles.compare}
      data-wire={hasWire || undefined}
      onPointerMove={(e) => hasWire && move(e.clientX)}
      onPointerDown={(e) => hasWire && move(e.clientX)}
      style={{ "--split": `${split}%` } as React.CSSProperties}
    >
      <video
        key={decade}
        ref={main}
        src={`${BASE}/vinheta-${decade}.mp4`}
        poster={`${BASE}/vinheta-${decade}.jpg`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={`Recopando vignette, ${decade} version`}
      />
      {hasWire && (
        <>
          <video
            ref={wire}
            className={styles.wire}
            src={`${BASE}/wireframe-${decade}.mp4`}
            poster={`${BASE}/wireframe-${decade}.jpg`}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
          />
          <span className={styles.handle} aria-hidden="true">
            <span>‹ ›</span>
          </span>
          <span className={`${styles.tag} ${styles.tagLeft}`}>{t("Final render")}</span>
          <span className={`${styles.tag} ${styles.tagRight}`}>{t("Blender wireframe")}</span>
        </>
      )}
    </div>
  );
}

function Scene3D({ active }: { active: boolean }) {
  const t = useT();
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(() => {
    const el = host.current;
    if (!el || !active) return;
    let disposed = false;
    let cleanup = () => {};
    setState("loading");
    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      controls.autoRotateSpeed = 0.6;

      // Material preview: the set's own materials and textures (downsized),
      // lit by a soft studio environment, like Blender's Material Preview.
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      // Geometry is Draco-compressed (decoder in /public/draco).
      const draco = new DRACOLoader().setDecoderPath("/draco/");
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`${BASE}/scene-mat.glb`);
      draco.dispose();
      if (disposed) return;
      // Frame the set (the room planes are left out of the export).
      scene.add(gltf.scene);
      // Centred on the main object: the TV stand (with the TV on it).
      let stand: Object3D | undefined;
      gltf.scene.traverse((o) => {
        if (!stand && /tvstand/i.test(o.name)) stand = o;
      });
      const bb = new THREE.Box3().setFromObject(stand ?? gltf.scene);
      const mid = bb.getCenter(new THREE.Vector3());
      // Aim a bit above the stand, at the TV.
      mid.y += bb.getSize(new THREE.Vector3()).length() * VIEW.lift;
      const size = bb.getSize(new THREE.Vector3()).length();
      controls.target.copy(mid);
      camera.position.set(mid.x + size * VIEW.side, mid.y + size * VIEW.up, mid.z + size * VIEW.back);
      camera.near = size / 200;
      camera.far = size * 40;
      camera.updateProjectionMatrix();
      controls.minDistance = size * 0.4;
      controls.maxDistance = size * 4;
      controls.update();

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();
      // Draws only while the scene is on screen.
      let raf = 0;
      const tick = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      const io = new IntersectionObserver(([e]) => {
        cancelAnimationFrame(raf);
        if (e.isIntersecting) tick();
      });
      io.observe(el);
      setState("ready");
      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        controls.dispose();
        env.dispose();
        pmrem.dispose();
        gltf.scene.traverse((o) => {
          const m = o as Mesh;
          m.geometry?.dispose();
          (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [active]);

  return (
    <div className={styles.scene} data-cursor="drag" data-lenis-prevent>
      <div ref={host} className={styles.canvas} />
      {state !== "ready" && <span className={styles.loading}>{t("Loading the 3D scene…")}</span>}
      <span className={`${styles.tag} ${styles.tagLeft}`}>{t("Blender scene · 00s")}</span>
      <span className={styles.hint}>{t("Drag to rotate · scroll to zoom")}</span>
    </div>
  );
}

export default function Recopando({ active }: { active: boolean }) {
  const t = useT();
  const [decade, setDecade] = useState<Decade>(WIRE);
  const [full, setFull] = useState(false);
  return (
    <div className={styles.root}>
      <p className={`${styles.note} ${styles.intro}`}>
        <Marked text={t(INTRO)} />
      </p>
      <Compare decade={decade} active={active} />
      {full && <Lightbox base={`${BASE}/vinheta-${decade}-full`} sound onClose={() => setFull(false)} />}
      {/* One line: decade switch on the left, "Watch full screen" on the right. */}
      <div className={styles.controls}>
        <div className={styles.decades} role="radiogroup" aria-label="Vignette version">
          {DECADES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === decade}
              className={styles.decade}
              data-on={d === decade || undefined}
              onClick={() => setDecade(d)}
            >
              {d}
              {d === WIRE && <span className={styles.wireDot}>wireframe</span>}
            </button>
          ))}
        </div>
        {/* The whole vignette alone (no wireframe), fullscreen with sound. */}
        <button type="button" className={styles.watch} data-cursor="view" onClick={() => setFull(true)}>
          <span className={styles.watchSquare} aria-hidden="true" />
          {t("Watch full screen")} · {decade}
        </button>
      </div>
      {/* Desktop: the text on the left (right-aligned), the 3D scene on 60% of the width. */}
      <div className={styles.sceneRow}>
        <p className={styles.note}>
          {t("Everything in the vignette was composed and animated in Blender: the room, the TVs, the PS2, the trophies.")}
        </p>
        <Scene3D active={active} />
      </div>
    </div>
  );
}
