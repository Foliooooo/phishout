import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { PlayerGuide } from "@/components/player-guide";
import { LevelStatus } from "@/components/level-status";
import { EXPERT_MISSIONS, LEVELS, NOVICE_MISSIONS } from "@/lib/levels";
import { getGame } from "@/lib/games";
import type { Game } from "@/lib/games";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Scales } from "@/components/ui/scales";
import { endlessGame, games } from "@/lib/games";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Games · PHISH OUT",
  description: "Explore PHISH OUT’s phishing missions and learn how to play each one.",
};

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4 sm:py-10">
      <ScrollReveal>
        <header data-reveal className="relative isolate overflow-hidden rounded-3xl bg-brand px-5 py-9 text-on-brand sm:px-10 sm:py-14">
          <Scales size={14} color="color-mix(in oklab, var(--color-on-brand) 18%, transparent)" />
          <Image src="/illustrations/phishout/hooked-mail.svg" alt="" width={400} height={320} priority className="pointer-events-none absolute top-0 right-4 hidden h-full w-auto max-w-[45%] object-contain object-right lg:block lg:right-10" />
          <div className="relative max-w-xl">
            <h1 className="w-fit rounded-2xl bg-brand text-5xl font-bold tracking-tight sm:text-7xl">Games</h1>
            <p className="mt-3 w-fit rounded-2xl bg-brand text-lg font-semibold">
              Explore {games.length} phishing missions, from suspicious links to fake sign-ins. Pick one for its objective and how to play.
            </p>
          </div>
        </header>
      </ScrollReveal>
      <PlayerGuide className="mt-6 sm:mt-8" />
      {(["novice", "expert"] as const).map(level => {
        const list = (level === "novice" ? NOVICE_MISSIONS : EXPERT_MISSIONS).map(slug => getGame(slug)).filter(Boolean) as Game[];
        return (
          <section key={level} aria-labelledby={`level-${level}`} className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="font-mono text-sm font-bold text-brand">Level {level === "novice" ? 1 : 2}</p>
                <h2 id={`level-${level}`} className="text-4xl font-bold tracking-tight">{LEVELS[level].title}</h2>
                <p className="mt-1 max-w-2xl text-ink-soft">{LEVELS[level].blurb}</p>
              </div>
              {level === "expert" ? <LevelStatus /> : null}
            </div>
            {level === "expert" ? (
              <Link href="/games/endless" className="group mb-4 flex flex-wrap items-center gap-4 rounded-3xl bg-ink p-5 text-paper sm:p-6">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand font-mono text-3xl font-bold text-on-brand">∞</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-xl font-bold">Endless mode <span className="rounded-full bg-paper/15 px-2 py-0.5 text-xs font-bold">Expert · AI</span></span>
                  <span className="mt-1 block text-paper/75">{endlessGame.blurb}</span>
                </span>
                <span className={cn(buttonStyles(), "transition-transform group-hover:translate-x-0.5")}>Play</span>
              </Link>
            ) : null}
            <ScrollReveal>
              <ul aria-label={`${LEVELS[level].title} missions`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map(game => (
                  <li key={game.slug} data-reveal>
                    <GameCard game={game} headingLevel={3} />
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </section>
        );
      })}
      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-brand-soft p-6">
        <div>
          <h2 className="text-2xl font-bold">Then: your certificate</h2>
          <p className="mt-1 text-ink-soft">Clear both levels and get a certificate with an ID anyone can verify.</p>
          <Link href="/game-info" className="mt-2 inline-block font-semibold underline underline-offset-4">Compare every game in one table</Link>
        </div>
        <Link href="/certificate" className={buttonStyles()}>See the certificate</Link>
      </section>
    </main>
  );
}
