import { ScrollReveal } from "@/components/scroll-reveal";
import { buttonStyles } from "@/components/ui/button";
import { games, getGame } from "@/lib/games";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { GameLearning } from "@/components/game-learning";
import { LumiGuide } from "@/components/lumi-guide";
import { gameLines } from "@/lib/guide";
import { LevelStatus } from "@/components/level-status";
import { LEVELS, levelOf } from "@/lib/levels";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const game = getGame(slug);
  return game ? { title: `${game.title} · PHISH OUT`, description: game.blurb } : {};
}

export default function GamePage({ params }: PageProps<"/games/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-8 sm:px-4">
      <Suspense fallback={null}>
        {params.then(({ slug }) => (
          <GameStage slug={slug} />
        ))}
      </Suspense>
    </main>
  );
}

function GameStage({ slug }: { slug: string }) {
  const game = getGame(slug);
  if (!game) notFound();

  return (
    <>
      <ScrollReveal>
        <header data-reveal className="relative overflow-hidden rounded-3xl bg-brand-soft p-6 sm:p-10">
          {game.mode !== "native" && (
            <Image
              src={game.mode === "terminal" ? "/illustrations/phishout/terminal-lens.svg" : "/illustrations/phishout/sandbox-crate.svg"}
              alt=""
              width={400}
              height={300}
              priority
              className="pointer-events-none absolute -right-4 -bottom-4 hidden w-[300px] md:block lg:w-[360px]"
            />
          )}
          <Link href="/games" className={buttonStyles({ variant: "raised" })}>
            All games
          </Link>
          <div className="mt-7 flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-paper">
              {LEVELS[levelOf(slug)].title}
            </span>
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-on-brand">
              Trains {game.skill.toLowerCase()}
            </span>
            <span className="rounded-full bg-paper-raised px-3 py-1 text-sm font-bold">
              {game.mode === "terminal" ? "Real terminal on the VM" : game.mode === "sandbox" ? "Real sandboxed browser" : "Plays right in this tab"}
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">{game.title}</h1>
          <p className="mt-3 max-w-xl text-lg text-ink">{game.blurb}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/games/${slug}/play`} className={buttonStyles()} prefetch={false}>Play {game.title}</Link>
            <LevelStatus slug={slug} />
          </div>
        </header>

        <div data-reveal className="mt-5"><LumiGuide lines={gameLines(slug)} title={`Lumi on ${game.title}`} tone="soft" /></div>

        <section data-reveal aria-labelledby="instructions" className="mt-5 rounded-3xl bg-paper-raised p-6 sm:p-8">
          <h2 id="instructions" className="text-3xl font-bold tracking-tight">How to play</h2>
          <p className="mt-3 font-bold">{game.objective}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-ink-soft marker:font-bold marker:text-ink">
            {game.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
          </ol>
          {slug !== "crush-switch" && (
            <p className="mt-5 text-sm text-ink-soft">
              {game.mode === "terminal" ? "Case folder" : "Starting address"} <code className="font-mono break-all text-ink">{game.startUrl}</code>
            </p>
          )}
        </section>

        <div data-reveal className="mt-5"><GameLearning slug={slug} /></div>
      </ScrollReveal>

    </>
  );
}
