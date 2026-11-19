"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const VERTEX = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/**
 * "Pink tide": flat, banded blobs of pink drifting over beige paper, with the
 * scales hatch drawn inside the pink. Colours arrive as uniforms read from the
 * theme tokens, so the shader follows light and dark mode.
 */
export const PINK_TIDE = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_dpr;

uniform vec3 u_paper;
uniform vec3 u_soft;
uniform vec3 u_brand;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.6;
  float t = u_time * 0.06;

  vec2 warp = vec2(fbm(p + t), fbm(p - t + 4.2));
  float n = fbm(p + 1.8 * warp + vec2(t, -t));

  vec2 m = vec2(u_mouse.x * aspect, u_mouse.y) * 1.6;
  n += 0.22 * exp(-dot(p - m, p - m) * 5.0);

  float soft = smoothstep(0.44, 0.45, n);
  float brand = smoothstep(0.58, 0.59, n);

  vec3 col = mix(u_paper, u_soft, soft);
  col = mix(col, u_brand, brand);

  // Scales hatch: 1px diagonal lines every 10px, pink on soft, soft on pink.
  float d = (gl_FragCoord.x + gl_FragCoord.y) / u_dpr;
  float line = 1.0 - step(1.0, mod(d, 10.0));
  col = mix(col, u_brand, line * soft * (1.0 - brand) * 0.55);
  col = mix(col, u_soft, line * brand * 0.35);

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Reads a `#rrggbb` theme token as 0-1 RGB. */
function token(name: string, fallback: [number, number, number]) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return fallback;
  const hex = parseInt(match[1], 16);
  return [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export interface ShaderCanvasProps {
  /**
   * GLSL ES 1.0 fragment shader. Gets u_res, u_time, u_mouse, u_dpr and the
   * theme colours u_paper, u_soft and u_brand.
   */
  fragment?: string;
  className?: string;
}

/**
 * Full-bleed WebGL canvas that fills its `relative` parent. Pauses when off
 * screen, renders a single still frame under reduced motion, and shows the
 * parent's background if WebGL is unavailable.
 */
export function ShaderCanvas({
  fragment = PINK_TIDE,
  className,
}: ShaderCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uDpr = gl.getUniformLocation(program, "u_dpr");
    const uPaper = gl.getUniformLocation(program, "u_paper");
    const uSoft = gl.getUniformLocation(program, "u_soft");
    const uBrand = gl.getUniformLocation(program, "u_brand");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let dpr = 1;
    let frame = 0;
    let visible = true;
    const start = performance.now();

    const draw = () => {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uDpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };

    const play = () => {
      cancelAnimationFrame(frame);
      if (visible && !reduced.matches) frame = requestAnimationFrame(loop);
      else draw();
    };

    const recolor = () => {
      gl.uniform3fv(uPaper, token("--color-paper", [0.957, 0.922, 0.851]));
      gl.uniform3fv(uSoft, token("--color-brand-soft", [1, 0.827, 0.894]));
      gl.uniform3fv(uBrand, token("--color-brand", [1, 0.373, 0.635]));
      draw();
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      draw();
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (event.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (event.clientY - rect.top) / rect.height;
    };

    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      play();
    });
    watcher.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    reduced.addEventListener("change", play);
    const themeWatcher = new MutationObserver(recolor);
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    recolor();
    resize();
    play();

    return () => {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      themeWatcher.disconnect();
      window.removeEventListener("pointermove", onPointer);
      reduced.removeEventListener("change", play);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [fragment]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("absolute inset-0 h-full w-full", className)}
    />
  );
}
