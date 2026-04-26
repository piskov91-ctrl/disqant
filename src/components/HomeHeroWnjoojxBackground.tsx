"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WNJOOJX_FRAGMENT, WNJOOJX_VERTEX } from "@/lib/wnjoojx-codepen-shaders";

function subscribePrefersReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animated WebGL2 background from CodePen https://codepen.io/atzedent/pen/WNJOOJX
 * ("Just a Beauty" by Matthias Hurrle / @atzedent). Fills the hero section.
 */
export function HomeHeroWnjoojxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [staticOnly, setStaticOnly] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotion,
    () => false
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || reducedMotion) return;
    const c = container;
    const cv = canvas;

    const gl = cv.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) {
      setStaticOnly(true);
      return;
    }
    const g = gl;

    const baseDpr = Math.min(2, window.devicePixelRatio || 1);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

    function compileShader(type: number, source: string) {
      const shader = g.createShader(type);
      if (!shader) return null;
      g.shaderSource(shader, source);
      g.compileShader(shader);
      if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) {
        console.error(g.getShaderInfoLog(shader));
        g.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function resize() {
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = baseDpr;
      const rw = Math.max(1, Math.floor(w * dpr));
      const rh = Math.max(1, Math.floor(h * dpr));
      if (cv.width !== rw || cv.height !== rh) {
        cv.width = rw;
        cv.height = rh;
      }
      g.viewport(0, 0, cv.width, cv.height);
    }

    function draw(
      now: number,
      drawProgram: WebGLProgram,
      unifs: {
        timeLoc: WebGLUniformLocation | null;
        touchLoc: WebGLUniformLocation | null;
        pointerCountLoc: WebGLUniformLocation | null;
        resolutionLoc: WebGLUniformLocation | null;
        drawBuffer: WebGLBuffer;
      }
    ) {
      g.clearColor(0, 0, 0, 1);
      g.clear(g.COLOR_BUFFER_BIT);
      if (
        !unifs.timeLoc ||
        !unifs.touchLoc ||
        !unifs.pointerCountLoc ||
        !unifs.resolutionLoc
      ) {
        return;
      }
      g.useProgram(drawProgram);
      g.bindBuffer(g.ARRAY_BUFFER, unifs.drawBuffer);
      g.uniform1f(unifs.timeLoc, now * 0.001);
      g.uniform2f(unifs.touchLoc, 0, 0);
      g.uniform1i(unifs.pointerCountLoc, 0);
      g.uniform2f(unifs.resolutionLoc, cv.width, cv.height);
      g.drawArrays(g.TRIANGLES, 0, 6);
    }

    const vs = compileShader(g.VERTEX_SHADER, WNJOOJX_VERTEX);
    const fs = compileShader(g.FRAGMENT_SHADER, WNJOOJX_FRAGMENT);
    if (!vs || !fs) {
      setStaticOnly(true);
      return;
    }

    const program = g.createProgram();
    if (!program) {
      setStaticOnly(true);
      return;
    }
    g.attachShader(program, vs);
    g.attachShader(program, fs);
    g.linkProgram(program);
    if (!g.getProgramParameter(program, g.LINK_STATUS)) {
      console.error(g.getProgramInfoLog(program));
      setStaticOnly(true);
      return;
    }

    const buffer = g.createBuffer();
    if (!buffer) {
      setStaticOnly(true);
      return;
    }
    g.bindBuffer(g.ARRAY_BUFFER, buffer);
    g.bufferData(g.ARRAY_BUFFER, vertices, g.STATIC_DRAW);

    const position = g.getAttribLocation(program, "position");
    g.enableVertexAttribArray(position);
    g.vertexAttribPointer(position, 2, g.FLOAT, false, 0, 0);

    const unifs = {
      timeLoc: g.getUniformLocation(program, "time"),
      touchLoc: g.getUniformLocation(program, "touch"),
      pointerCountLoc: g.getUniformLocation(program, "pointerCount"),
      resolutionLoc: g.getUniformLocation(program, "resolution"),
      drawBuffer: buffer,
    };

    let raf = 0;
    const loop = (now: number) => {
      draw(now, program, unifs);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(c);
    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      const ext = g.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, [reducedMotion]);

  const showStatic = reducedMotion || staticOnly;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden
    >
      {showStatic ? (
        <div
          className="h-full w-full"
          style={{
            background: `repeating-radial-gradient(circle at center, #444 0 10%, #111 10% 20%)`,
          }}
        />
      ) : null}
      {!showStatic ? (
        <canvas
          ref={canvasRef}
          className="h-full w-full object-cover [display:block]"
          style={{ minHeight: "100%" }}
        />
      ) : null}
    </div>
  );
}
