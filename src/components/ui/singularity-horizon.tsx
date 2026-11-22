"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { linkProgram } from "@/lib/webgl";
import { DEFAULT_SINGULARITY_STATES, type SingularityState } from "./singularity-states";

// The 21st.dev "Singularity Horizon" (raw WebGL2), with named readouts and a slot for hero content.

export type Readout = { label: string; value: string };

type SingularityHorizonProps = {
  // A definite length: the canvas fills this box.
  height?: string;
  states?: SingularityState[];
  // Milliseconds each state holds before easing into the next.
  interval?: number;
  readouts?: { left: Readout[]; right: Readout[] };
  particles?: number;
  // Drag to orbit the camera.
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
};

const HORIZON = 4;
const CORE_QUAD = 5.6;

// Shown only when WebGL2 is missing: a still of the same subject.
const FALLBACK =
  "radial-gradient(circle at 50% 50%, #000 12%, rgba(255,120,20,0.55) 13%, rgba(255,70,10,0.18) 22%, rgba(20,60,180,0.16) 45%, #010103 70%)";

const VIGNETTE = "radial-gradient(circle at 50% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)";

const DISK_VERT = `#version 300 es
precision highp float;

in vec2 aCorner;
in vec3 aSeed;            // x: radius, y: start angle, z: height in the disk

uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uCam;
uniform float uTime;
uniform float uMorph;
uniform float uCompression;
uniform float uIntensity;
uniform float uOrbit;

out vec3 vColor;
out float vAlpha;
out vec2 vCorner;

float turbulence(vec2 p, float t) {
  return sin(p.x * 0.9 + t) * 0.5
       + sin(p.y * 1.1 - t * 0.8) * 0.3
       + sin((p.x + p.y) * 0.7 + t * 1.3) * 0.2;
}

void main() {
  float r0 = aSeed.x;
  float r = r0 * uCompression;
  float angle = aSeed.y + uTime * (1.5 / sqrt(r0)) * uOrbit;

  vec3 pos = vec3(cos(angle) * r, aSeed.z, sin(angle) * r);
  pos.y += turbulence(pos.xz * 0.08, uTime * 0.3) * uMorph * 4.0;

  vec3 viewDir = normalize(uCam - pos);
  vec3 tangent = vec3(-sin(angle), 0.0, cos(angle));

  // Matter swinging toward the camera blueshifts and brightens.
  float doppler = dot(tangent, viewDir);

  vec3 hot = vec3(1.0, 0.95, 0.9);
  vec3 warm = vec3(1.0, 0.45, 0.1);
  vec3 cool = vec3(0.1, 0.35, 1.0);
  vec3 color = mix(cool, warm, smoothstep(45.0, 12.0, r));
  color = mix(color, hot, smoothstep(10.0, 4.0, r));

  vColor = color * (1.3 + doppler * 0.7) * uIntensity;
  vAlpha = smoothstep(3.8, 5.5, r) * (1.0 - smoothstep(38.0, 48.0, r)) * 0.8;
  vCorner = aCorner;

  // Billboard the streak: long along the orbit, thin across the view.
  vec3 side = cross(tangent, viewDir);
  side = length(side) > 0.001 ? normalize(side) : vec3(0.0, 1.0, 0.0);
  vec3 offset = tangent * aCorner.x * 1.1 + side * aCorner.y * 0.13;

  gl_Position = uProj * uView * vec4(pos + offset, 1.0);
}
`;

const DISK_FRAG = `#version 300 es
precision highp float;

in vec3 vColor;
in float vAlpha;
in vec2 vCorner;
out vec4 outColor;

void main() {
  float across = 1.0 - vCorner.y * vCorner.y;
  float along = 1.0 - vCorner.x * vCorner.x * 0.35;
  outColor = vec4(vColor, vAlpha * across * along);
}
`;

const CORE_VERT = `#version 300 es
precision highp float;

in vec2 aCorner;

uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uRight;
uniform vec3 uUp;
uniform float uSize;

out vec2 vCorner;

void main() {
  vCorner = aCorner;
  vec3 pos = uRight * aCorner.x * uSize + uUp * aCorner.y * uSize;
  gl_Position = uProj * uView * vec4(pos, 1.0);
}
`;

// Draws the horizon twice: an opaque black sphere that hides the far side of the disk, then an additive rim.
const CORE_FRAG = `#version 300 es
precision highp float;

in vec2 vCorner;

uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uForward;    // origin toward the camera
uniform float uSize;
uniform float uHorizon;
uniform float uIntensity;
uniform bool uGlow;

out vec4 outColor;

void main() {
  float d = length(vCorner) * uSize;
  if (uGlow) {
    if (d < uHorizon) discard;
    float rim = pow(smoothstep(uSize, uHorizon, d), 3.0);
    gl_FragDepth = gl_FragCoord.z;
    outColor = vec4(vec3(1.0, 0.45, 0.1) * rim * uIntensity * 1.6, rim);
  } else {
    if (d > uHorizon) discard;
    // The quad is flat but the horizon is a sphere: bulge the depth per fragment.
    float bulge = sqrt(max(uHorizon * uHorizon - d * d, 0.0));
    vec3 pos = uRight * vCorner.x * uSize + uUp * vCorner.y * uSize + uForward * bulge;
    vec4 clip = uProj * uView * vec4(pos, 1.0);
    gl_FragDepth = (clip.z / clip.w) * 0.5 + 0.5;
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}
`;

function perspective(out: Float32Array, fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
}

// Looks at the origin. Also writes the camera basis the billboards need.
function lookAtOrigin(out: Float32Array, eye: number[], right: number[], up: number[], forward: number[]) {
  const len = Math.hypot(eye[0], eye[1], eye[2]) || 1;
  const z = [eye[0] / len, eye[1] / len, eye[2] / len];
  const flat = Math.hypot(z[2], z[0]);
  const x = flat > 1e-5 ? [z[2] / flat, 0, -z[0] / flat] : [1, 0, 0];
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  out.set([
    ...[x[0], y[0], z[0], 0],
    ...[x[1], y[1], z[1], 0],
    ...[x[2], y[2], z[2], 0],
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ]);
  for (let i = 0; i < 3; i += 1) {
    right[i] = x[i];
    up[i] = y[i];
    forward[i] = z[i];
  }
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function ReadoutList({ items, accent, className }: { items: Readout[]; accent: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {items.map((item) => (
        <div key={item.label}>
          {item.label}: <span style={{ color: accent }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SingularityHorizon({
  height = "100svh",
  states = DEFAULT_SINGULARITY_STATES,
  interval = 10000,
  readouts,
  particles = 5000,
  interactive = true,
  className,
  children,
}: SingularityHorizonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [generation, setGeneration] = useState(0);

  const cycle = states.length ? states : DEFAULT_SINGULARITY_STATES;
  const current = cycle[index % cycle.length];

  // The render loop reads the target through a ref, so a state change never restarts WebGL.
  const targetRef = useRef(current);
  useEffect(() => {
    targetRef.current = current;
  }, [current]);

  useEffect(() => {
    if (reduced || cycle.length < 2 || interval <= 0) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % cycle.length), interval);
    return () => window.clearInterval(id);
  }, [reduced, cycle.length, interval]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!canvas || !fallback) return;

    const fail = () => {
      canvas.style.display = "none";
      fallback.style.display = "block";
    };

    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) return fail();

    const diskProgram = linkProgram(gl, DISK_VERT, DISK_FRAG);
    const coreProgram = linkProgram(gl, CORE_VERT, CORE_FRAG);
    if (!diskProgram || !coreProgram) return fail();

    const count = Math.max(1, Math.round(particles));
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      // Dense near the horizon, thinning outward.
      const r = 5 + Math.pow(Math.random(), 1.3) * 40;
      seeds[i * 3] = r;
      seeds[i * 3 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 3 + 2] = (Math.random() - 0.5) * (8 / r);
    }

    const corners = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const cornerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
    const seedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

    const diskVao = gl.createVertexArray();
    gl.bindVertexArray(diskVao);
    const diskCorner = gl.getAttribLocation(diskProgram, "aCorner");
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.enableVertexAttribArray(diskCorner);
    gl.vertexAttribPointer(diskCorner, 2, gl.FLOAT, false, 0, 0);
    const diskSeed = gl.getAttribLocation(diskProgram, "aSeed");
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
    gl.enableVertexAttribArray(diskSeed);
    gl.vertexAttribPointer(diskSeed, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(diskSeed, 1);

    const coreVao = gl.createVertexArray();
    gl.bindVertexArray(coreVao);
    const coreCorner = gl.getAttribLocation(coreProgram, "aCorner");
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.enableVertexAttribArray(coreCorner);
    gl.vertexAttribPointer(coreCorner, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const u = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
    const diskU = {
      proj: u(diskProgram, "uProj"),
      view: u(diskProgram, "uView"),
      cam: u(diskProgram, "uCam"),
      time: u(diskProgram, "uTime"),
      morph: u(diskProgram, "uMorph"),
      compression: u(diskProgram, "uCompression"),
      intensity: u(diskProgram, "uIntensity"),
      orbit: u(diskProgram, "uOrbit"),
    };
    const coreU = {
      proj: u(coreProgram, "uProj"),
      view: u(coreProgram, "uView"),
      right: u(coreProgram, "uRight"),
      up: u(coreProgram, "uUp"),
      forward: u(coreProgram, "uForward"),
      size: u(coreProgram, "uSize"),
      horizon: u(coreProgram, "uHorizon"),
      intensity: u(coreProgram, "uIntensity"),
      glow: u(coreProgram, "uGlow"),
    };

    const proj = new Float32Array(16);
    const view = new Float32Array(16);
    const right = [1, 0, 0];
    const up = [0, 1, 0];
    const forward = [0, 0, 1];

    const start = targetRef.current;
    const eased = {
      morph: start.morph,
      compression: start.compression,
      intensity: start.intensity,
      orbit: start.orbit,
      spin: start.spin,
      distance: start.camDistance,
      height: start.camHeight,
    };
    let theta = Math.PI * 0.25;
    let heightOffset = 0;
    let simTime = reduced ? 9 : 0;
    let last = 0;
    let raf = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const draw = (now: number) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      resize();

      if (!reduced) {
        // Exponential approach toward the current state.
        const k = 1 - Math.exp(-dt / 1.2);
        const t = targetRef.current;
        eased.morph += (t.morph - eased.morph) * k;
        eased.compression += (t.compression - eased.compression) * k;
        eased.intensity += (t.intensity - eased.intensity) * k;
        eased.orbit += (t.orbit - eased.orbit) * k;
        eased.spin += (t.spin - eased.spin) * k;
        eased.distance += (t.camDistance - eased.distance) * k;
        eased.height += (t.camHeight - eased.height) * k;
        simTime += dt;
        theta += eased.spin * dt;
      }

      // A portrait viewport would crop the disk on both sides, so dolly out.
      const aspect = canvas.width / canvas.height;
      const fit = aspect < 1 ? Math.min(1 / aspect, 1.6) : 1;
      const distance = eased.distance * fit;
      const camY = Math.max(-distance * 0.9, Math.min(distance * 0.9, eased.height * fit + heightOffset));
      const radius = Math.sqrt(Math.max(distance * distance - camY * camY, 16));
      const eye = [Math.cos(theta) * radius, camY, Math.sin(theta) * radius];

      perspective(proj, (40 * Math.PI) / 180, aspect, 0.1, 1000);
      lookAtOrigin(view, eye, right, up, forward);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.004, 0.004, 0.012, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      // 1. Opaque horizon, depth written so it eclipses the far side.
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.useProgram(coreProgram);
      gl.bindVertexArray(coreVao);
      gl.uniformMatrix4fv(coreU.proj, false, proj);
      gl.uniformMatrix4fv(coreU.view, false, view);
      gl.uniform3fv(coreU.right, right);
      gl.uniform3fv(coreU.up, up);
      gl.uniform3fv(coreU.forward, forward);
      gl.uniform1f(coreU.size, CORE_QUAD);
      gl.uniform1f(coreU.horizon, HORIZON);
      gl.uniform1f(coreU.intensity, eased.intensity);
      gl.uniform1i(coreU.glow, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 2. The disk, additive and depth-tested against the horizon.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.useProgram(diskProgram);
      gl.bindVertexArray(diskVao);
      gl.uniformMatrix4fv(diskU.proj, false, proj);
      gl.uniformMatrix4fv(diskU.view, false, view);
      gl.uniform3fv(diskU.cam, eye);
      gl.uniform1f(diskU.time, simTime);
      gl.uniform1f(diskU.morph, eased.morph);
      gl.uniform1f(diskU.compression, eased.compression);
      gl.uniform1f(diskU.intensity, eased.intensity);
      gl.uniform1f(diskU.orbit, eased.orbit);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

      // 3. Photon-sphere rim, always on top.
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(coreProgram);
      gl.bindVertexArray(coreVao);
      gl.uniform1i(coreU.glow, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    // Under reduced motion nothing loops: frames are drawn on demand.
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    kick();

    const sized = new ResizeObserver(kick);
    sized.observe(canvas);
    // Stop drawing while the hero is scrolled off screen.
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) kick();
    });
    seen.observe(canvas);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (event: PointerEvent) => {
      if (!interactive) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      theta -= (event.clientX - lastX) * 0.005;
      heightOffset = Math.max(-30, Math.min(30, heightOffset + (event.clientY - lastY) * 0.15));
      lastX = event.clientX;
      lastY = event.clientY;
      kick();
    };
    const onUp = (event: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    // A lost context stays black unless the whole setup runs again.
    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => setGeneration((g) => g + 1);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      cancelAnimationFrame(raf);
      sized.disconnect();
      seen.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.deleteProgram(diskProgram);
      gl.deleteProgram(coreProgram);
      gl.deleteBuffer(cornerBuffer);
      gl.deleteBuffer(seedBuffer);
      gl.deleteVertexArray(diskVao);
      gl.deleteVertexArray(coreVao);
    };
  }, [particles, interactive, reduced, generation]);

  return (
    <section className={cn("relative w-full overflow-hidden bg-[#010103] text-white", className)} style={{ height }}>
      <div ref={fallbackRef} className="absolute inset-0 hidden" style={{ background: FALLBACK }} />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "absolute inset-0 block size-full",
          // pan-y, not none: a phone must still be able to scroll past a full-screen canvas.
          interactive && "cursor-grab touch-pan-y active:cursor-grabbing",
        )}
      />
      <div className="pointer-events-none absolute inset-0 z-10" style={{ background: VIGNETTE }} />
      {children && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3/5 bg-linear-to-t from-[#010103] via-[#010103]/70 to-transparent" />
      )}

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10">
        <div key={index} className="animate-in text-center duration-1000 fade-in motion-reduce:animate-none">
          <div className="mb-3 text-[0.8rem] font-light tracking-[0.5em] uppercase opacity-90 sm:text-[1.2rem] sm:tracking-[0.8em]">
            {current.title}
          </div>
          <div
            className="inline-block rounded-full border bg-white/[0.03] px-5 py-1.5 text-[0.6rem] tracking-[0.25em] uppercase"
            style={{ color: current.accent, borderColor: current.accent }}
          >
            {current.status}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {children}
          {readouts && (
            <div className="flex items-end justify-between gap-4 font-mono text-[0.6rem] tracking-wider uppercase opacity-60 sm:text-[0.7rem]">
              <ReadoutList items={readouts.left} accent={current.accent} />
              <ReadoutList items={readouts.right} accent={current.accent} className="text-right" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
