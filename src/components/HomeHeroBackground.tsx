"use client";

import { motion, useReducedMotion } from "framer-motion";

const ORBS = [
  {
    className:
      "-left-[20%] -top-[10%] h-[min(55vw,420px)] w-[min(55vw,420px)] rounded-full bg-violet-600/25 blur-[90px]",
    d: 22,
  },
  {
    className:
      "right-[-15%] top-[20%] h-[min(50vw,380px)] w-[min(50vw,380px)] rounded-full bg-fuchsia-500/20 blur-[85px]",
    d: 26,
  },
  {
    className:
      "bottom-[-20%] left-[30%] h-[min(45vw,340px)] w-[min(45vw,340px)] rounded-full bg-indigo-500/18 blur-[95px]",
    d: 20,
  },
] as const;

const PARTICLES = [
  { top: "14%", left: "11%", size: 2, opacity: 0.22, delay: 0, duration: 14 },
  { top: "62%", left: "8%", size: 1.5, opacity: 0.18, delay: 2, duration: 18 },
  { top: "28%", left: "78%", size: 2, opacity: 0.2, delay: 1, duration: 16 },
  { top: "78%", left: "72%", size: 1, opacity: 0.16, delay: 3, duration: 20 },
  { top: "44%", left: "52%", size: 1.5, opacity: 0.14, delay: 0.5, duration: 22 },
  { top: "88%", left: "38%", size: 2, opacity: 0.18, delay: 2.5, duration: 17 },
  { top: "8%", left: "45%", size: 1, opacity: 0.14, delay: 4, duration: 19 },
  { top: "52%", left: "22%", size: 1.5, opacity: 0.12, delay: 1.2, duration: 21 },
] as const;

export function HomeHeroBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_45%,transparent_20%,rgba(0,0,0,0.55)_100%)]" />

      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:56px_56px] motion-reduce:animate-none motion-safe:animate-[home-hero-grid_90s_linear_infinite] sm:[background-size:64px_64px]"
        style={{
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
        }}
      />

      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          className={`absolute ${o.className}`}
          animate={
            reduce
              ? { x: 0, y: 0, scale: 1, opacity: 0.45 }
              : {
                  x: [0, 24, 0, -12, 0],
                  y: [0, 14, 0, 20, 0],
                  scale: [1, 1.05, 1, 1.03, 1],
                  opacity: [0.35, 0.48, 0.38, 0.46, 0.35],
                }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: o.d, repeat: Infinity, ease: "easeInOut" }
          }
        />
      ))}

      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: p.top,
            left: p.left,
            width: p.size * 3,
            height: p.size * 3,
            boxShadow: "0 0 10px rgba(196, 181, 253, 0.3), 0 0 2px rgba(255, 255, 255, 0.15)",
          }}
          animate={
            reduce
              ? { y: 0, opacity: p.opacity }
              : {
                  y: [0, -8, 0, 5, 0],
                  opacity: [p.opacity, p.opacity * 1.35, p.opacity * 0.85, p.opacity * 1.1, p.opacity],
                }
          }
          transition={
            reduce
              ? { duration: 0 }
              : {
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
