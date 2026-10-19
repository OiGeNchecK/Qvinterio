"use client";

import { useEffect, useRef } from "react";

// Thin flowing gold lines, adapted from React Bits "Threads"
// (https://reactbits.dev/backgrounds/threads) to plain WebGL. Two bundles sweep
// along the top and bottom edges like the gold curves on the logo artwork, and
// the centre is kept dark so text stays calm.

type Props = {
  background?: string;
  color?: string;
  intensity?: number;
  mobileIntensity?: number;
  speed?: number;
  className?: string;
};

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform float dpr;
uniform vec3 lineColor;
uniform vec3 bgColor;
uniform float intensity;

const int LINES = 14;

// Sum of lines in one bundle; base(x) is the bundle's centre curve (y down, 0..1).
float bundle(vec2 uv, float baseY, float fan, float phase) {
  float h = iResolution.y;
  float acc = 0.0;
  for (int i = 0; i < LINES; i++) {
    float p = float(i) / float(LINES - 1);
    float wave =
      sin(uv.x * 2.1 + iTime * 0.9 + p * 3.0 + phase) * 0.6 +
      sin(uv.x * 4.3 - iTime * 0.6 + p * 5.0 + phase * 1.7) * 0.4;
    float y = baseY + (p - 0.5) * fan + wave * fan * 0.35;
    float d = abs(uv.y - y) * h;
    float core = smoothstep(0.9 * dpr, 0.0, d);
    float glow = smoothstep(6.0 * dpr, 0.0, d) * 0.18;
    acc += (core + glow) * (1.0 - p * 0.55);
  }
  return acc;
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y) / iResolution;
  float x = uv.x;
  float portrait = step(iResolution.x, iResolution.y);

  // Top: enters high on the left and leaves through the top right corner.
  float topY = mix(0.17, 0.12, portrait) * pow(1.0 - x, 1.4) - 0.04;
  float top = bundle(uv, topY, 0.03 + 0.07 * x, 0.0);

  // Bottom: starts low on the left and sweeps up the right edge.
  float botY = 1.02 - mix(0.40, 0.28, portrait) * pow(x, 1.6);
  float bot = bundle(uv, botY, 0.03 + 0.09 * x, 2.3);

  float lines = top + bot;

  // Keep a calm dark space in the middle of the screen.
  vec2 c = (uv - vec2(0.42, 0.5)) * vec2(1.2, 1.6);
  lines *= 0.3 + 0.7 * smoothstep(0.35, 0.85, length(c));

  // Fade behind the header so the logo and menu stay clean.
  float yPx = uv.y * iResolution.y / dpr;
  lines *= 0.15 + 0.85 * smoothstep(60.0, 110.0, yPx);

  // Gentle shimmer travelling along the lines.
  lines *= 0.75 + 0.25 * sin(x * 6.0 - iTime * 1.3);

  gl_FragColor = vec4(bgColor + lineColor * clamp(lines, 0.0, 1.5) * intensity, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function Threads({
  background = "#111110",
  color = "#C4A46B",
  intensity = 0.32,
  mobileIntensity = 0.26,
  speed = 0.08,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // One triangle covering the whole viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform3fv(u("lineColor"), hexToRgb(color));
    gl.uniform3fv(u("bgColor"), hexToRgb(background));
    gl.uniform1f(u("intensity"), mobile ? mobileIntensity : intensity);
    gl.uniform1f(u("dpr"), dpr);

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u("iResolution"), w, h);
    };
    resize();

    const draw = (t: number) => {
      gl.uniform1f(u("iTime"), (t / 1000) * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frame = 0;
    let visible = true;
    const loop = (t: number) => {
      draw(t);
      if (visible) frame = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(20000);
    });
    ro.observe(canvas);

    if (reduceMotion) {
      // Still image, no movement.
      draw(20000);
      return () => ro.disconnect();
    }

    // Pause while the tab or canvas is hidden.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(loop);
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
    };
  }, [background, color, intensity, mobileIntensity, speed]);

  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
}
