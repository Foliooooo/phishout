import { cn } from "@/lib/utils";
import React from "react";

const variants = {
  primary: "bg-brand text-on-brand hover:bg-brand-deep",
  secondary: "bg-paper-deep text-ink",
  raised: "bg-paper-raised text-ink",
  dark: "bg-ink text-paper",
} as const;

const sizes = {
  sm: "h-10 rounded-xl px-4 text-sm",
  md: "h-12 rounded-2xl px-6 text-base",
  lg: "h-14 rounded-2xl px-8 text-lg",
} as const;

export interface ButtonStyleProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

/** Class names for anything that should look like a button (e.g. a Link). */
export function buttonStyles({
  variant = "primary",
  size = "md",
}: ButtonStyleProps = {}) {
  return cn(
    "depth inline-flex shrink-0 items-center justify-center gap-2 pb-1 font-bold whitespace-nowrap select-none",
    "transition-[transform,box-shadow,background-color] duration-75",
    "active:depth-pressed active:translate-y-0.5 active:pb-0",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ButtonStyleProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    />
  );
}
