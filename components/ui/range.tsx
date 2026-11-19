"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

/**
 * A styled native range input: keyboard, touch and screen readers work as
 * usual. The filled part of the track follows the value via a CSS variable.
 */
export function Range({
  label, value, min, max, step = 1, format = String, onChange, tone = "dark", className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
  tone?: "dark" | "light";
  className?: string;
}) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  const dark = tone === "dark";
  return (
    <div className={cn("group", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={cn("text-[13px]", dark ? "text-lab-text" : "text-ink")}>{label}</label>
        <output htmlFor={id} className={cn("rounded-md px-1.5 py-0.5 font-mono text-[12px] tabular-nums transition-colors", dark ? "bg-lab-fg/[0.06] text-lab-text group-focus-within:bg-[#ff5fa2] group-focus-within:text-[#2b1d24]" : "bg-paper-deep text-ink")}>
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        style={{ "--fill": `${percent}%` } as React.CSSProperties}
        className={cn(
          "mt-2 h-6 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none",
          // Track: a filled part in pink, the rest muted.
          "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
          "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full",
          "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[#ff5fa2]",
          dark
            ? "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#ff5fa2_var(--fill),color-mix(in_oklab,var(--color-lab-fg)_12%,transparent)_var(--fill))] [&::-moz-range-track]:bg-lab-fg/10"
            : "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#ff5fa2_var(--fill),var(--color-paper-deep)_var(--fill))] [&::-moz-range-track]:bg-paper-deep",
          // Thumb: a pink knob with a soft halo that grows on hover and focus.
          "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,95,162,0.9)] [&::-webkit-slider-thumb]:transition-shadow",
          "hover:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_#ff5fa2,0_0_0_10px_rgba(255,95,162,0.2)] focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_#ff5fa2,0_0_0_10px_rgba(255,95,162,0.35)]",
          "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_4px_#ff5fa2]",
        )}
      />
    </div>
  );
}
