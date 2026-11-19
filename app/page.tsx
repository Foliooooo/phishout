import { GameCard } from "@/components/game-card";
import { Hero } from "@/components/hero";
import { PlayerGuide } from "@/components/player-guide";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Ticker } from "@/components/ticker";
import { games } from "@/lib/games";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    mark: "01",
    title: "Pick a mission",
    body: "Open a fresh Chromium sandbox on our VM and start with a message, a browser prompt, or a familiar-looking page.",
    tone: "bg-paper-raised",
  },
  {
    mark: "02",
    title: "Poke around",
    body: "Open the mail, preview the links, or check the request through a saved site. Every message and action is simulated.",
    tone: "bg-brand-soft",
  },
  {
    mark: "03",
    title: "Get the debrief",
    body: "See what you caught, what caught you, and why. Your best result from each mission goes toward your rank.",
    tone: "bg-brand text-on-brand",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero slugs={games.map((game) => game.slug)} />

      <Ticker
        className="mt-10"
        words={["Pause", "Inspect", "Verify", "Report"]}
      />

      <div className="mx-auto w-full max-w-6xl px-3 pt-12 sm:px-4">
        <PlayerGuide />
      </div>

      <section
        id="games"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-3 pt-16 sm:px-4"
      >
        <ScrollReveal>
          <div data-reveal className="mb-8 px-2">
            <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Start an investigation.
            </h2>
            <p className="mt-2 text-lg text-ink-soft">
              {games.length} missions based on situations you might run into online.
            </p>
            <div className="mt-4 flex flex-wrap gap-3"><Link href="/games/crush-switch/play" className={buttonStyles()}>Play Crush Switch</Link><Link href="/games" className={buttonStyles({variant:"secondary"})}>All missions</Link></div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, index) => (
              <li
                key={game.slug}
                data-reveal
                className={cn(index === 0 && "sm:col-span-2")}
              >
                <GameCard game={game} featured={index === 0} />
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </section>

      <section
        id="how"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-3 pt-24 sm:px-4"
      >
        <ScrollReveal>
          <h2
            data-reveal
            className="mb-8 px-2 text-4xl font-bold tracking-tight sm:text-6xl"
          >
            A browser you&rsquo;re allowed to break.
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.mark}
                data-reveal
                className={cn("rounded-3xl p-6 sm:p-8", step.tone)}
              >
                <span className="font-mono text-6xl font-bold tracking-tighter">
                  {step.mark}
                </span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-base">{step.body}</p>
              </li>
            ))}
          </ol>
        </ScrollReveal>
      </section>

    </main>
  );
}
