"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { linkProgram } from "@/lib/webgl";

// The frame shown when the visitor asks for reduced motion.
const STILL_SECONDS = 24;

// Shown before WebGL starts and when it is missing: the same colors, standing still.
const FALLBACK =
  "radial-gradient(120% 90% at 20% 15%, rgba(124,58,237,0.45), transparent 60%), radial-gradient(90% 70% at 85% 35%, rgba(160,195,236,0.28), transparent 60%), radial-gradient(70% 50% at 45% 70%, rgba(255,122,23,0.22), transparent 65%), #05050c";

const VERTEX = `#version 300 es
in vec2 aCorner;
void main() { gl_Position = vec4(aCorner, 0.0, 1.0); }`;

// A noise field warped by itself twice reads as slow liquid. Colors are the design.md accents.
const FRAGMENT = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 uRes;
uniform float uTime;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return v;
}
void main() {
  float unit = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / unit;
  float t = uTime * 0.05;

  vec2 p = uv * 2.3 + vec2(3.0, 1.0);
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 1.4), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 1.1));
  float f = fbm(p + 2.6 * r);

  vec3 dusk = vec3(0.486, 0.227, 0.929);
  vec3 breeze = vec3(0.627, 0.765, 0.925);
  vec3 sunset = vec3(1.0, 0.478, 0.09);
  float n = smoothstep(0.3, 0.6, f);
  float cool = smoothstep(0.44, 0.6, q.y);
  float warm = smoothstep(0.5, 0.64, r.y) * (1.0 - 0.6 * cool);
  vec3 col = mix(vec3(0.03, 0.02, 0.09), dusk, n);
  col = mix(col, breeze, cool * n * 0.75);
  col = mix(col, sunset, warm * n * 0.7);
  col *= 0.2 + 0.78 * n;

  // Stars, hidden where the gas is bright.
  vec2 g = gl_FragCoord.xy / unit * 70.0;
  vec2 id = floor(g);
  float s = hash(id);
  vec2 c = fract(g) - 0.5 - (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
  float star = smoothstep(0.07, 0.0, length(c)) * step(0.92, s) * (0.55 + 0.45 * sin(uTime * (0.6 + s * 2.0) + s * 60.0));
  col += star * (1.0 - smoothstep(0.15, 0.6, n)) * vec3(0.9, 0.95, 1.0);

  // A planet in the lower corner, lit from the upper left.
  vec2 pc = vec2(0.38, -0.98);
  float d = length(uv - pc) - 0.66;
  float lit = smoothstep(-0.3, 0.7, dot(normalize(uv - pc), normalize(vec2(-0.55, 0.83))));
  col = mix(col, vec3(0.008, 0.009, 0.02), smoothstep(0.003, -0.003, d));
  col += breeze * lit * (exp(-abs(d) * 90.0) * 0.9 + exp(-max(d, 0.0) * 10.0) * 0.22 * step(0.0, d));

  col *= 1.0 - 0.3 * dot(uv, uv);
  O = vec4(pow(col, vec3(0.9)), 1.0);
}`;

type Scene = { draw: (seconds: number) => void; dispose: () => void };

function createScene(canvas: HTMLCanvasElement): Scene | null {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  const program = gl && linkProgram(gl, VERTEX, FRAGMENT);
  if (!gl || !program) return null;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, "aCorner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);
  const resolution = gl.getUniformLocation(program, "uRes");
  const time = gl.getUniformLocation(program, "uTime");

  return {
    draw(seconds) {
      // Soft clouds do not need every device pixel.
      const scale = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = Math.max(1, Math.round(canvas.clientWidth * scale));
      const height = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(time, seconds);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

// A slow liquid nebula with stars and a planet, in one WebGL2 fragment shader.
export function LiquidNebula({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // undefined: not started yet. null: WebGL2 is missing, the gradient stays.
    let scene: Scene | null | undefined;
    let frame = 0;

    const loop = (now: number) => {
      scene?.draw(now / 1000);
      frame = requestAnimationFrame(loop);
    };
    // Starts on first sight, so a hidden panel on a phone never opens a WebGL context.
    const seen = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (!entry?.isIntersecting) return;
      if (scene === undefined) scene = createScene(canvas);
      if (!scene) return;
      canvas.style.opacity = "1";
      if (still) scene.draw(STILL_SECONDS);
      else frame = requestAnimationFrame(loop);
    });
    seen.observe(canvas);
    const sized = new ResizeObserver(() => {
      if (still) scene?.draw(STILL_SECONDS);
    });
    sized.observe(canvas);

    return () => {
      seen.disconnect();
      sized.disconnect();
      cancelAnimationFrame(frame);
      scene?.dispose();
    };
  }, []);

  return (
    <div aria-hidden className={cn("absolute inset-0", className)} style={{ background: FALLBACK }}>
      <canvas ref={canvasRef} className="size-full opacity-0 transition-opacity duration-700" />
    </div>
  );
}
