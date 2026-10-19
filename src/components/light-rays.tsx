"use client";

import { useEffect, useRef } from "react";

// Light rays background, adapted from React Bits "Light Rays"
// (https://reactbits.dev/backgrounds/light-rays) to plain WebGL.

type Props = {
  /** Background colour behind the rays. */
  background?: string;
  raysColor?: string;
  /** Ray source in fractions of the canvas; y < 0 is above the top edge. */
  origin?: [number, number];
  /** Direction the rays point to (screen space, y down). */
  direction?: [number, number];
  /** Half-angle of the light cone in degrees. */
  coneAngle?: number;
  speed?: number;
  intensity?: number;
  mobileIntensity?: number;
  lightSpread?: number;
  rayLength?: number;
  mouseInfluence?: number;
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
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform vec3 bgColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float intensity;
uniform vec2 mousePos;
uniform float mouseInfluence;
uniform float coneCos;

float rayStrength(vec2 source, vec2 refDir, vec2 coord, float seedA, float seedB, float speed) {
  vec2 toCoord = coord - source;
  vec2 dirNorm = normalize(toCoord);
  float cosAngle = dot(dirNorm, refDir);
  float spread = pow(max(cosAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float dist = length(toCoord);
  float maxDist = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDist - dist) / maxDist, 0.0, 1.0);
  float base = clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0);
  return base * lengthFalloff * spread;
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
  vec2 dir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 toMouse = normalize(mousePos * iResolution - rayPos);
    dir = normalize(mix(rayDir, toMouse, mouseInfluence));
  }
  float r1 = rayStrength(rayPos, dir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  float r2 = rayStrength(rayPos, dir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  float rays = r1 * 0.5 + r2 * 0.4;
  // Clip the light to a cone so it reads as the "V" of the logo.
  float c = dot(normalize(coord - rayPos), dir);
  rays *= smoothstep(coneCos - 0.06, coneCos + 0.02, c);
  // Soften the hot spot at the tip of the V.
  rays *= 0.35 + 0.65 * smoothstep(0.0, 0.45 * iResolution.y, length(coord - rayPos));
  gl_FragColor = vec4(bgColor + raysColor * rays * intensity, 1.0);
}
`;

// Bottom centre, shining up: the cone opens into a "V".
const DEFAULT_ORIGIN: [number, number] = [0.5, 1.05];
const DEFAULT_DIRECTION: [number, number] = [0, -1];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function LightRays({
  background = "#111715",
  raysColor = "#D4E88B",
  origin = DEFAULT_ORIGIN,
  direction = DEFAULT_DIRECTION,
  coneAngle = 30,
  speed = 0.35,
  intensity = 0.3,
  mobileIntensity = 0.2,
  lightSpread = 1.4,
  rayLength = 1.5,
  mouseInfluence = 0.06,
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
    const len = Math.hypot(direction[0], direction[1]);
    gl.uniform2f(u("rayDir"), direction[0] / len, direction[1] / len);
    gl.uniform3fv(u("raysColor"), hexToRgb(raysColor));
    gl.uniform3fv(u("bgColor"), hexToRgb(background));
    gl.uniform1f(u("raysSpeed"), speed);
    gl.uniform1f(u("lightSpread"), lightSpread);
    gl.uniform1f(u("coneCos"), Math.cos((coneAngle * Math.PI) / 180));
    gl.uniform1f(u("intensity"), mobile ? mobileIntensity : intensity);
    const influence = reduceMotion || mobile ? 0 : mouseInfluence;
    gl.uniform1f(u("mouseInfluence"), influence);

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u("iResolution"), w, h);
      gl.uniform2f(u("rayPos"), origin[0] * w, origin[1] * h);
      // Ray length follows the taller side so the V reaches the top on phones too.
      gl.uniform1f(u("rayLength"), (rayLength * Math.max(w, h)) / w);
    };
    resize();

    // Mouse position, eased so the rays drift instead of jumping.
    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = (e.clientY - r.top) / r.height;
    };

    const draw = (t: number) => {
      mouse.x += (target.x - mouse.x) * 0.03;
      mouse.y += (target.y - mouse.y) * 0.03;
      gl.uniform2f(u("mousePos"), mouse.x, mouse.y);
      gl.uniform1f(u("iTime"), t / 1000);
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
      if (reduceMotion) draw(4000);
    });
    ro.observe(canvas);

    if (reduceMotion) {
      // Still image, no movement.
      draw(4000);
      return () => ro.disconnect();
    }

    // Pause while the canvas is hidden.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    if (influence > 0) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [background, raysColor, origin, direction, coneAngle, speed, intensity, mobileIntensity, lightSpread, rayLength, mouseInfluence]);

  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
}
