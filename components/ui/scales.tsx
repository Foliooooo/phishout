import { cn } from "@/lib/utils";
import React from "react";

export interface ScalesProps {
  orientation?: "horizontal" | "vertical" | "diagonal";
  size?: number;
  className?: string;
  /** Any CSS color. Defaults to `--pattern-scales` from globals.css. */
  color?: string;
}

const ANGLES = {
  horizontal: "0deg",
  vertical: "90deg",
  diagonal: "315deg",
} as const;

export const Scales = ({
  orientation = "diagonal",
  size = 10,
  className,
  color,
}: ScalesProps) => {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full overflow-hidden",
        className,
      )}
      style={
        {
          "--scales-size": `${size}px`,
          "--scales-angle": ANGLES[orientation],
          ...(color && { "--pattern-scales": color }),
        } as React.CSSProperties
      }
    >
      <div
        className="h-full w-full bg-[repeating-linear-gradient(var(--scales-angle),var(--pattern-scales)_0,var(--pattern-scales)_1px,transparent_0,transparent_50%)]"
        style={{
          backgroundSize: `var(--scales-size) var(--scales-size)`,
        }}
      />
    </div>
  );
};

export interface ScalesContainerProps extends ScalesProps {
  children?: React.ReactNode;
  containerClassName?: string;
}

export const ScalesContainer = ({
  children,
  orientation = "diagonal",
  size = 10,
  className,
  containerClassName,
  color,
}: ScalesContainerProps) => {
  return (
    <div className={cn("relative", containerClassName)}>
      <Scales
        orientation={orientation}
        size={size}
        className={className}
        color={color}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
