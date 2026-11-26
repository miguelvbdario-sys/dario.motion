"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Broadcast.module.css";

import { useT } from "@/lib/i18n";
/*
 * PROCESS tab (Paulistão card): the 3D trophy, small square, drag to rotate.
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = box.current;
    if (!host || !active) return;
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
      controls.minDistance = dist * 0.6;
      controls.maxDistance = dist * 1.6;
      controls.update();
      setReady(true);

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
      renderer.setAnimationLoop(() => {
        if (!onScreen) return;
        controls.update();
        renderer.render(scene, camera);
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
  }, [active]);

  return (
    <div className={styles.trophyWrap}>
      <div ref={box} className={styles.trophy} aria-label="3D trophy, drag to rotate" role="img">
        {!ready && <span className={styles.trophyLoading}>{t("Loading 3D…")}</span>}
        <span className={styles.previewLabel}>{t("3D · Drag to rotate")}</span>
      </div>
    </div>
  );
}
