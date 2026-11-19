"use client";

import { Scales } from "@/components/ui/scales";
import type { Game, GameTone } from "@/lib/games";
import { LEVELS, levelOf } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import Link from "next/link";

const tones: Record<GameTone, { card: string; scales: string; pill: string }> = {
  brand: {
    card: "bg-brand text-on-brand",
    scales: "color-mix(in oklab, #fff 45%, transparent)",
    pill: "bg-on-brand text-brand",
  },
  soft: {
    card: "bg-brand-soft text-ink",
    scales: "color-mix(in oklab, var(--color-brand) 45%, transparent)",
    pill: "bg-brand text-on-brand",
  },
  raised: {
    card: "bg-paper-raised text-ink",
    scales: "color-mix(in oklab, var(--color-brand) 35%, transparent)",
    pill: "bg-brand-soft text-ink",
  },
  deep: {
    card: "bg-paper-deep text-ink",
    scales: "color-mix(in oklab, var(--color-ink) 14%, transparent)",
    pill: "bg-paper-raised text-ink",
  },
  ink: {
    card: "bg-ink text-paper",
    scales: "color-mix(in oklab, var(--color-brand) 55%, transparent)",
    pill: "bg-brand text-on-brand",
  },
  caution: {
    card: "bg-caution text-on-brand",
    scales: "color-mix(in oklab, var(--color-on-brand) 16%, transparent)",
    pill: "bg-on-brand text-caution",
  },
};

export function GameCard({
  game,
  featured = false,
  headingLevel = 3,
  className,
}: {
  game: Game;
  featured?: boolean;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const tone = tones[game.tone];

  return (
    <motion.div
      className={cn("h-full", className)}
      whileHover={{ y: -6, rotate: featured ? -0.4 : -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
    >
      <Link
        href={`/games/${game.slug}`}
        className={cn(
          "depth group relative flex h-full flex-col overflow-hidden rounded-3xl pb-1",
          "transition-[box-shadow] duration-75 active:depth-pressed",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
          tone.card,
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden",
            featured ? "h-56 sm:h-72" : "h-44",
          )}
        >
          <Scales
            orientation={game.scales}
            size={featured ? 14 : 10}
            color={tone.scales}
          />
          <span
            aria-hidden
            className={cn(
              "relative font-mono leading-none font-bold tracking-tighter transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3 motion-reduce:transition-none",
              featured ? "text-[9rem] sm:text-[12rem]" : "text-8xl",
            )}
          >
            {game.glyph}
          </span>
          <span
            className={cn(
              "absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase",
              tone.pill,
            )}
          >
            {game.skill}
          </span>
          <span className="absolute top-4 right-4 rounded-full bg-paper-raised px-3 py-1 text-xs font-bold tracking-wide text-ink uppercase">
            {game.slug === "endless" ? "Expert" : LEVELS[levelOf(game.slug)].title}
          </span>
          {!game.playable && (
            <span className="absolute top-12 right-4 rounded-full bg-paper-raised px-3 py-1 text-xs font-bold tracking-wide text-ink uppercase">
              Offline
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-6 pt-2 pb-6">
          <Heading
            className={cn(
              "font-bold tracking-tight",
              featured ? "text-3xl sm:text-4xl" : "text-2xl",
            )}
          >
            {game.title}
          </Heading>
          <p className={cn("opacity-80", featured ? "text-lg" : "text-base")}>
            {game.blurb}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
