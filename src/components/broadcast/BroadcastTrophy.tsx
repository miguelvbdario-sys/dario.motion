"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Broadcast.module.css";

import { useT } from "@/lib/i18n";
import { useLite } from "@/lib/lite";
import { useInView } from "@/lib/useInView";
/*
 * The trophy square (Paulistão About), drag to rotate.
 *
 * Performance: by default it is a VIDEO of the turntable (turntable.mp4,
 * rendered from this same scene at the same speed), so opening the card
 * builds no 3D scene. The real 3D loads only when the visitor clicks / taps
 * it, starting at the angle the video was showing, and fades in over the
 * video: full rotation in every direction is kept. Closing the card goes back
 * to the video for the next time it opens.
 * Lite mode (weak devices, src/lib/lite.ts): a still image (first frame).
 *
 * 3D:
 * Model: /public/broadcast/paulistao/trophy/trophy.glb, exported from
 * "TAÇA 3D.blend" (textures cut to 1K, Draco-compressed mesh; the Draco
 * decoder files sit in the same folder). three.js is loaded only when this
 * tab mounts, so the rest of the site doesn't pay for it.
 */

const DIR = "/broadcast/paulistao/trophy/";

/**
 * Decals on the front. height: centre, as a fraction of the trophy height from
 * its middle (+ up, − down). width: fraction of the trophy width. aspect:
 * image height / width.
 */
type Decal = { file: string; height: number; width: number; aspect: number };
const DECALS: Decal[] = [
  { file: "plaque.webp", height: 0.36, width: 0.22, aspect: 1 },
  { file: "crown.webp", height: 0.455, width: 0.1, aspect: 168 / 212 },
];
/** Distance off the surface, as a fraction of the trophy depth. */
const GAP = 0.018;

export default function BroadcastTrophy({ active }: { active: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lite = useLite();
  const seen = useInView(box);
  /** The visitor reached for the trophy: load the real 3D. */
  const [want3D, setWant3D] = useState(false);
  /** The 3D is on screen (the video is hidden and paused). */
  const [ready, setReady] = useState(false);

  // Card closed: back to the video for the next opening.
  useEffect(() => {
    if (active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWant3D(false);
    setReady(false);
  }, [active]);

    // The turntable video plays while the square is on screen.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && seen && !ready && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) v.play().catch(() => {});
    else v.pause();
  }, [active, seen, ready]);

  useEffect(() => {
    const host = box.current;
    if (!host || !active || !want3D || lite) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = styles.trophyCanvas;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(3, 5, 4);
      scene.add(key);

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.6;
      controls.minPolarAngle = Math.PI * 0.2;
      controls.maxPolarAngle = Math.PI * 0.75;

      const draco = new DRACOLoader().setDecoderPath(DIR);
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`${DIR}trophy.glb`);
      if (disposed) return;
      const model = gltf.scene;
      // Centre it and frame the camera on its height.
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      model.position.sub(bounds.getCenter(new THREE.Vector3()));
      scene.add(model);

      // Paulistão plaque + crown (not in the .blend). Each is a decal wrapped
      // around the trophy's vertical axis (a curved strip at the body's radius,
      // found with a ray from the front), sitting just off the surface: close
      // enough not to look like it floats, far enough not to sink into the
      // relief as it turns.
      model.updateMatrixWorld(true);
      const loader = new THREE.TextureLoader();
      const addDecal = async (d: Decal) => {
        const tex = await loader.loadAsync(`${DIR}${d.file}`);
        if (disposed) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const hit = new THREE.Raycaster(
          new THREE.Vector3(0, size.y * d.height, size.z * 2),
          new THREE.Vector3(0, 0, -1),
        ).intersectObject(model, true)[0];
        if (!hit) return;
        const r = Math.hypot(hit.point.x, hit.point.z) + size.z * GAP;
        const w = size.x * d.width;
        const geo = new THREE.PlaneGeometry(w, w * d.aspect, 24, 1);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const a = pos.getX(i) / r; // arc length → angle
          pos.setXYZ(i, Math.sin(a) * r, pos.getY(i) + hit.point.y, Math.cos(a) * r);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.4,
            // Same polished gold as the trophy; the artwork doubles as a bump
            // map so the engraving catches the light.
            bumpMap: tex,
            bumpScale: 2,
            metalness: 1,
            roughness: 0.28,
            polygonOffset: true,
            polygonOffsetFactor: -4,
          }),
        );
        scene.add(mesh);
      };
      await Promise.all(DECALS.map(addDecal));
      if (disposed) return;

      const dist = (size.y / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.25;
      camera.position.set(0, size.y * 0.1, dist);
      // Same angle as the video at this moment (the video turns the camera by
      // -2π over its length, like autoRotate does).
      const v = video.current;
      if (v && v.duration) {
        const angle = ((v.currentTime % v.duration) / v.duration) * Math.PI * 2;
        const sph = new THREE.Spherical().setFromVector3(camera.position);
        sph.theta -= angle;
        camera.position.setFromSpherical(sph);
      }
      controls.minDistance = dist * 0.6;
      controls.maxDistance = dist * 1.6;
      controls.update();

      const resize = () => {
        const w = host.clientWidth;
        renderer.setSize(w, w, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      // Render only while the square is on screen.
      let onScreen = true;
      const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
      io.observe(host);
      let shown = false;
      renderer.setAnimationLoop(() => {
        if (!onScreen) return;
        controls.update();
        renderer.render(scene, camera);
        if (!shown) {
          // First frame drawn: fade the 3D in over the video.
          shown = true;
          renderer.domElement.setAttribute("data-on", "");
          setReady(true);
        }
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        ro.disconnect();
        io.disconnect();
        controls.dispose();
        draco.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [active, want3D, lite]);

  const reach = () => {
    if (!lite) setWant3D(true);
  };

  return (
    <div className={styles.trophyWrap}>
      <div
        ref={box}
        className={styles.trophy}
        aria-label="3D trophy, drag to rotate"
        role="img"
        onPointerDown={reach}
      >
        {lite ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.trophyMedia} src={`${DIR}turntable.jpg`} alt="" />
        ) : (
          <video
            ref={video}
            className={styles.trophyMedia}
            src={`${DIR}turntable.mp4`}
            poster={`${DIR}turntable.jpg`}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
            data-off={ready || undefined}
          />
        )}
        <span className={styles.previewLabel}>{t(lite ? "3D" : "3D · Drag to rotate")}</span>
      </div>
    </div>
  );
}
