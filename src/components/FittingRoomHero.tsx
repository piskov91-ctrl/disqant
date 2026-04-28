"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Group, WebGLRenderer } from "three";

type SceneProps = { animate: boolean };

/** Minimal corner fitting room: walls, floor, mirrors, rack — kept low-poly for mobile. */
function FittingRoomScene({ animate }: SceneProps) {
  const root = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!animate || !root.current) return;
    root.current.rotation.y += delta * 0.082;
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.42} />
      <directionalLight position={[5.5, 7, 4]} intensity={0.48} color="#fff6ed" />
      <pointLight position={[1.2, 2.9, 2.2]} intensity={0.85} color="#fff2e6" distance={16} decay={2} />
      <pointLight position={[-2.5, 1.6, 1.8]} intensity={0.22} color="#c5d2f5" distance={14} decay={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#ded8cf" roughness={0.86} metalness={0.04} />
      </mesh>

      <mesh position={[0, 1.7, -3.02]}>
        <planeGeometry args={[7.2, 3.4]} />
        <meshStandardMaterial color="#f2ece4" roughness={0.94} metalness={0} />
      </mesh>

      <mesh position={[-3.02, 1.7, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.2, 3.4]} />
        <meshStandardMaterial color="#ede8e0" roughness={0.93} metalness={0} />
      </mesh>

      <mesh position={[3.02, 1.7, -0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[5.4, 3.4]} />
        <meshStandardMaterial color="#eae4dc" roughness={0.93} metalness={0} />
      </mesh>

      <mesh position={[0, 1.55, -2.985]}>
        <planeGeometry args={[2.9, 2.25]} />
        <meshStandardMaterial color="#98a0ad" metalness={0.96} roughness={0.08} />
      </mesh>

      <mesh position={[-2.985, 1.42, 1.15]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.05, 1.85]} />
        <meshStandardMaterial color="#8a929e" metalness={0.9} roughness={0.14} />
      </mesh>

      <group position={[0.85, 0, 1.15]}>
        <mesh position={[-0.36, 1.1, 0]}>
          <cylinderGeometry args={[0.034, 0.034, 2.18, 10]} />
          <meshStandardMaterial color="#3c3a38" metalness={0.62} roughness={0.38} />
        </mesh>
        <mesh position={[0.36, 1.1, 0]}>
          <cylinderGeometry args={[0.034, 0.034, 2.18, 10]} />
          <meshStandardMaterial color="#3c3a38" metalness={0.62} roughness={0.38} />
        </mesh>
        <mesh position={[0, 2.16, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.84, 10]} />
          <meshStandardMaterial color="#454340" metalness={0.68} roughness={0.32} />
        </mesh>

        {[
          { x: -0.24, color: "#6b6670", zRot: 0.07 },
          { x: 0, color: "#8e7a8f", zRot: -0.04 },
          { x: 0.24, color: "#6d7a8a", zRot: 0.05 },
        ].map((g, i) => (
          <mesh key={i} position={[g.x, 1.74, 0]} rotation={[0, 0, g.zRot]}>
            <boxGeometry args={[0.36, 0.48, 0.045]} />
            <meshStandardMaterial color={g.color} roughness={0.91} metalness={0.05} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function FittingRoomHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [webglOk, setWebglOk] = useState(false);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebglOk(Boolean(c.getContext("webgl2") ?? c.getContext("webgl")));
    } catch {
      setWebglOk(false);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onMq = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => setOffscreen(!e?.isIntersecting), {
      threshold: 0.04,
      rootMargin: "100px",
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const animate = webglOk && !reduceMotion && !offscreen;

  const onCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    gl.setClearColor(0x000000, 0);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[min(100%,520px)] overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-lg shadow-black/40 md:max-w-none"
    >
      <div
        className="relative aspect-[4/3] w-full min-h-[220px] max-h-[min(68vh,560px)] sm:min-h-[260px] md:aspect-[5/4]"
        role="img"
        aria-label="Minimal 3D fitting room with mirrors and a clothing rack, slowly rotating"
      >
        {mounted && webglOk ? (
          <Canvas
            camera={{ position: [4.2, 2.35, 4.35], fov: 40, near: 0.1, far: 40 }}
            dpr={[1, Math.min(1.75, typeof window !== "undefined" ? window.devicePixelRatio : 1)]}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "default",
            }}
            onCreated={onCreated}
            style={{ width: "100%", height: "100%", display: "block" }}
            aria-hidden
          >
            <Suspense fallback={null}>
              <FittingRoomScene animate={animate} />
            </Suspense>
          </Canvas>
        ) : !mounted ? (
          <div
            className="absolute inset-0 animate-pulse rounded-2xl bg-zinc-800/30"
            aria-hidden
          />
        ) : (
          <div
            className="flex h-full min-h-[220px] items-center justify-center rounded-2xl bg-zinc-900/50 px-6 text-center text-sm text-zinc-400"
            role="note"
          >
            Interactive preview needs WebGL.
          </div>
        )}
      </div>
    </div>
  );
}
