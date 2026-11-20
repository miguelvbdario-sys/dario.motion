"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { vectorBus } from "@/lib/vectorBus";
import styles from "./Hero.module.css";

/** Brushed dark chrome: metallic enough to catch reflections, rough enough to show the facets. */
const CHROME = { color: "#5c5c63", metalness: 0.78, roughness: 0.4 } as const;

type EmblemProps = {
  /** Unique name, used by the hero's vector overlay. */
  id: string;
  /** Path of the .gltf under /public. A chrome fallback mesh shows if it is missing. */
  src: string;
  label: string;
  /** Idle spin around the model's own Y axis, in radians per second. */
  speed?: number;
};

const FRAME_PADDING = 6; // px of air between the model and its vector frame

/**
 * Keeps its children spinning on their own Y axis, whatever the camera does.
 * While the model is hovered or dragged, it also publishes the model's box on
 * screen to the hero's vector overlay (a frame that marks the object's size).
 */
function Spin({
  speed,
  id,
  dragging,
  children,
}: {
  speed: number;
  id: string;
  dragging: boolean;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const reported = useRef(false);
  const point = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => vectorBus.setFrame(id, null), [id]);

  useFrame(({ camera, gl }, delta) => {
    const g = group.current;
    if (!g) return;

    // Cursor hint: the custom cursor turns into its translucent disc only
    // while it is over the model itself (or dragging it), not the empty
    // corners of the canvas.
    const wantCursor = hovered.current || dragging ? "link" : null;
    if ((gl.domElement.dataset.cursor ?? null) !== wantCursor) {
      if (wantCursor) gl.domElement.dataset.cursor = wantCursor;
      else delete gl.domElement.dataset.cursor;
    }

    // Clamp delta so the model doesn't jump after the tab was in the background.
    g.rotation.y += Math.min(delta, 0.1) * speed;

    if (!(hovered.current || dragging)) {
      if (reported.current) {
        vectorBus.setFrame(id, null);
        reported.current = false;
      }
      return;
    }

    // Project the model's vertices (every 4th is plenty) to find its exact
    // outline on screen as it turns.
    g.updateWorldMatrix(true, true);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    g.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const pos = child.geometry.getAttribute("position");
      if (!pos) return;
      for (let i = 0; i < pos.count; i += 4) {
        point.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld).project(camera);
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      }
    });
    if (!Number.isFinite(minX)) return;
    const r = gl.domElement.getBoundingClientRect();
    vectorBus.setFrame(id, {
      left: r.left + ((minX + 1) / 2) * r.width - FRAME_PADDING,
      right: r.left + ((maxX + 1) / 2) * r.width + FRAME_PADDING,
      top: r.top + ((1 - maxY) / 2) * r.height - FRAME_PADDING,
      bottom: r.top + ((1 - minY) / 2) * r.height + FRAME_PADDING,
    });
    reported.current = true;
  });

  return (
    <group
      ref={group}
      onPointerOver={() => {
        hovered.current = true;
      }}
      onPointerOut={() => {
        hovered.current = false;
      }}
    >
      {children}
    </group>
  );
}

function Model({ src }: { src: string }) {
  // `false` = no Draco decoder, so nothing is fetched from an external CDN.
  const { scene } = useGLTF(src, false);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ ...CHROME, side: THREE.DoubleSide }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Centre the model on the origin and normalise it to 2 units across, so any
  // file dropped in /public/3d fits the frame and spins around its own centre.
  const object = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z, 1e-6);
    root.scale.setScalar(scale);
    root.position.copy(centre).multiplyScalar(-scale);
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) child.material = material;
    });
    return root;
  }, [scene, material]);

  return <primitive object={object} />;
}

/** Shown while the model loads, and for good if the file is missing. */
function FallbackMesh() {
  return (
    <mesh>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial {...CHROME} flatShading />
    </mesh>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Studio reflections built from light panels, so no HDR file has to download. */
function Studio() {
  return (
    // Rendered once (frames={1}): the studio never moves, so re-rendering the
    // reflection cube every frame was wasted work.
    <Environment resolution={256} frames={1}>
      {/* A mid-grey room keeps the chrome charcoal instead of pure black. */}
      <color attach="background" args={["#26262a"]} />
      <Lightformer form="rect" intensity={3} position={[0, 5, 1]} rotation-x={Math.PI / 2} scale={[9, 3, 1]} />
      <Lightformer form="rect" intensity={1.8} position={[-5, 1.5, 2]} rotation-y={Math.PI / 2} scale={[7, 1.2, 1]} />
      <Lightformer form="rect" intensity={1.8} position={[5, -0.5, 2]} rotation-y={-Math.PI / 2} scale={[7, 1.2, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[0, 1.5, 6]} scale={[6, 0.8, 1]} />
      {/* A faint warm bounce from the glow behind the hero. */}
      <Lightformer form="rect" intensity={0.5} color="#ff7214" position={[3, -4, -3]} scale={[6, 3, 1]} />
    </Environment>
  );
}

export default function Emblem({ id, src, label, speed = 0.7 }: EmblemProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Stop rendering while the emblem is off screen.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "100px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // And while the tab is in the background.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      ref={wrapper}
      className={styles.emblemCanvas}
      data-dragging={dragging || undefined}
      data-cursor="default"
      role="img"
      aria-label={`${label}. Drag to rotate.`}
    >
      <Canvas
        // Capped at 1.5× (2× on retina rendered 4× the pixels for little gain).
        dpr={[1, 1.5]}
        // Stops while off screen and while the tab is hidden.
        frameloop={inView && visible ? "always" : "never"}
        camera={{ fov: 30, position: [0, 0.7, 4.9], near: 0.1, far: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <Studio />
        <ambientLight intensity={0.35} />
        <directionalLight position={[-3, 5, 4]} intensity={2.2} />
        <directionalLight position={[4, -1, 3]} intensity={0.6} />
        <Spin id={id} dragging={dragging} speed={reducedMotion ? 0 : speed}>
          <ModelBoundary fallback={<FallbackMesh />}>
            <Suspense fallback={<FallbackMesh />}>
              <Model src={src} />
            </Suspense>
          </ModelBoundary>
        </Spin>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.9}
          // Free spin sideways, but stop short of the poles, where a flat
          // emblem would only show its thin edge.
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
          onStart={() => setDragging(true)}
          onEnd={() => setDragging(false)}
        />
      </Canvas>
    </div>
  );
}
