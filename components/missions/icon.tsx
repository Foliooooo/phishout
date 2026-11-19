"use client";

import { PikaIcon } from "@pikaicons/react";
import type { ComponentProps } from "react";

export * from "@pikaicons/core-free";

type IconData = ComponentProps<typeof PikaIcon>["icon"];

/** Pikaicons with sensible defaults for the game UI (decorative unless labelled). */
export function Icon({ icon, size = 18, strokeWidth = 1.75, ...props }: Omit<ComponentProps<typeof PikaIcon>, "icon"> & { icon: IconData }) {
  return <PikaIcon icon={icon} size={size} strokeWidth={strokeWidth} {...props} />;
}
