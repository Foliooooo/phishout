"use client";

import type { PublicScene } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";
import type { ReactNode } from "react";
import { CheckTickCircleIcon, Icon, SearchIcon } from "../icon";

const DESTINATION = /destination|address bar|link|tab|site|origin/i;

/** The real destination of the scene's main link, once the player has inspected. */
export function destinationOf(scene: PublicScene | null) {
  const clue = scene?.clues?.find(item => DESTINATION.test(item.field) && /\.|\//.test(item.value));
  return clue?.value ?? null;
}

/** "Avery · Finance" → { name: "Avery", meta: "Finance" } */
export function senderParts(sender: string) {
  const [name, ...rest] = sender.split(" · ");
  return { name, meta: rest.join(" · ") };
}

export function initials(name: string) {
  return name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

const PALETTE = ["#1a73e8", "#e37400", "#188038", "#9334e6", "#c5221f", "#007b83", "#b80672"];
export function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Profile photos for recurring characters (Unsplash License, see public/missions/photos/credits.json). */
export const PHOTO_AVATARS: Record<string, string> = {
  Riley: "/missions/photos/avatar-riley.jpg",
  Jordan: "/missions/photos/avatar-jordan.jpg",
  "Pizza people": "/missions/photos/avatar-group.jpg",
  Avery: "/missions/photos/avatar-avery.jpg",
  Mira: "/missions/photos/avatar-mira.jpg",
};

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const photo = PHOTO_AVATARS[name];
  if (photo) {
    return <Image src={photo} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full font-medium text-white", className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: Math.round(size * 0.4) }}
    >
      {initials(name)}
    </span>
  );
}

/** Animated container used when a scene's content swaps in. */
export function SceneIn({ id, children, className }: { id: string | number; children: ReactNode; className?: string }) {
  return (
    <motion.div
      key={id}
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The scene's "check" action. It looks like a native control of whichever app
 * it sits in (pass `className`), with a consistent search icon so players
 * learn to find it.
 */
export function InspectButton({ scene, onInspect, busy, className, doneClassName }: {
  scene: PublicScene; onInspect: () => void; busy: boolean; className?: string; doneClassName?: string;
}) {
  if (scene.inspected) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[13px] text-[#188038]", doneClassName)}>
        <Icon icon={CheckTickCircleIcon} size={15} />Checked. Flag what looks wrong in Evidence.
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onInspect}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dadce0] bg-white px-3 text-[13px] font-medium text-[#1a73e8] transition-colors hover:bg-[#f6fafe] disabled:opacity-60", className)}
    >
      <Icon icon={SearchIcon} size={14} />
      {scene.check}
    </button>
  );
}
