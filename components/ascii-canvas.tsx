"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/**
 * Animated ASCII art on a canvas: an ocean of characters with a fish in it.
 *  - "loader": the fish swims across while the page loads.
 *  - "lost":   404, the fish is caught on a hook under a big ASCII "404".
 * Colours come from the theme tokens, so it follows light and dark mode.
 * Under reduced motion it draws one still frame.
 */


const DIGITS: Record<string, string[]> = {
  "4": ["#   #", "#   #", "#####", "    #", "    #"],
  "0": [" ### ", "#   #", "#   #", "#   #", " ### "],
};
const BIG_404 = DIGITS["4"].map((_, row) => ["4", "0", "4"].map(d => DIGITS[d][row].replace(/#/g, "█")).join("  "));
const WATER = " .·:-~=≈";

function token(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function AsciiCanvas({ scene, className, label }: { scene: "loader" | "lost"; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let colors = { ink: "#2b1d24", soft: "#6f5f62", brand: "#ff5fa2" };
    const recolor = () => {
      colors = { ink: token("--color-ink", colors.ink), soft: token("--color-ink-soft", colors.soft), brand: token("--color-brand", colors.brand) };
    };
    recolor();
    const theme = new MutationObserver(recolor);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let cell = 14;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      cell = width < 480 ? 11 : 14;
      cols = Math.ceil(width / (cell * 0.62));
      rows = Math.ceil(height / cell);
    };
    resize();
    const sizer = new ResizeObserver(resize);
    sizer.observe(canvas);

    /** Draws text at pixel coordinates in a given font size (for the big pieces). */
    const big = (text: string, x: number, y: number, size: number, color: string, weight = 600) => {
      ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.font = `${cell}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    };


    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = cell * 0.62;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${cell}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "top";

      // The sea: rolling waves of characters, fading towards the top.
      const surface = Math.floor(rows * (scene === "lost" ? 0.55 : 0.35));
      for (let y = surface; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const wave = Math.sin(x * 0.22 + t * 1.6 + y * 0.5) + Math.sin(x * 0.07 - t * 0.9 + y * 0.3);
          const level = Math.floor(((wave + 2) / 4) * (WATER.length - 1) * Math.min(1, (y - surface + 2) / 4));
          const char = WATER[Math.max(0, level)];
          if (char === " ") continue;
          ctx.globalAlpha = 0.18 + 0.25 * ((wave + 2) / 4);
          ctx.fillStyle = colors.soft;
          ctx.fillText(char, x * w, y * cell);
        }
      }
      ctx.globalAlpha = 1;

      const width = canvas.width / dpr;
      const fishSize = Math.round(cell * 1.7);
      if (scene === "loader") {
        // A fish swims across, trailing bubbles.
        const fishWidth = fishSize * 0.62 * 7;
        const x = ((t * 90) % (width + fishWidth * 2)) - fishWidth;
        const y = (surface + (rows - surface) / 2) * cell + Math.sin(t * 3) * cell * 0.6;
        big("><(((º>", x, y, fishSize, colors.brand, 700);
        for (let b = 0; b < 3; b += 1) {
          const rise = ((t * 1.2 + b * 0.45) % 1.4) * cell * 3;
          big(b % 2 ? "o" : "°", x - (b + 1) * cell * 0.9, y - rise, cell, colors.soft, 400);
        }
        // Wordmark with a gentle wave, letter by letter.
        const word = "PHISH//OUT";
        const size = Math.min(48, Math.max(26, width / 16));
        const advance = size * 0.62;
        const wx = width / 2 - (word.length * advance) / 2;
        const wy = Math.max(cell, (surface * cell) / 2 - size * 0.9);
        for (let i = 0; i < word.length; i += 1) {
          const lift = still ? 0 : Math.sin(t * 4 - i * 0.55) * size * 0.08;
          big(word[i], wx + i * advance, wy + lift, size, word[i] === "/" ? colors.brand : colors.ink, 700);
        }
        const dots = ".".repeat(1 + (Math.floor(t * 2) % 3));
        big(`${label ?? "loading"}${dots}`, wx, wy + size * 1.25, cell, colors.soft, 400);
      } else {
        // Big block "404" on the left of centre, the line and hook to its right.
        const art = BIG_404;
        const size = Math.min(22, Math.max(12, width / 40));
        const advance = size * 0.62;
        const artWidth = art[0].length * advance;
        const ax = width / 2 - artWidth / 2 - size * 2;
        const ay = Math.max(cell, (surface * cell) / 2 - (art.length * size) / 2);
        art.forEach((line, i) => {
          const glitch = !still && Math.random() < 0.02 ? size * 0.3 : 0;
          big(line, ax + glitch, ay + i * size, size, colors.ink, 400);
        });
        const hx = ax + artWidth + size * 3;
        const bob = still ? 0 : Math.sin(t * 2.2) * cell * 0.5;
        const hookY = (surface + 2) * cell + bob;
        ctx.strokeStyle = colors.soft;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx, hookY);
        ctx.stroke();
        big("J", hx - fishSize * 0.31, hookY - fishSize * 0.2, fishSize, colors.soft, 400);
        const fish = Math.floor(t * 3) % 2 ? "<º)))><" : "><(((º>";
        big(fish, hx - fishSize * 0.62 * 3.5, hookY + fishSize * 0.75, fishSize, colors.brand, 700);
      }

      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      sizer.disconnect();
      theme.disconnect();
    };
  }, [scene, label]);

  return <canvas ref={ref} aria-hidden className={cn("block h-full w-full", className)} />;
}

/** Full-width loading block for route segments and Suspense fallbacks. */
export function PageLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("relative mx-auto h-64 w-full max-w-3xl overflow-hidden rounded-3xl bg-paper-raised sm:h-80", className)}>
      <AsciiCanvas scene="loader" label={label} />
      <span className="sr-only">{label ?? "Loading"}…</span>
    </div>
  );
}
