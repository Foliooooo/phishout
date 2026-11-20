import type { Metadata } from "next";
import Link from "next/link";
import { endlessGame, games, learningFor, type Game } from "@/lib/games";
import { LEVELS, levelOf } from "@/lib/levels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Game info · PHISH OUT",
  description: "Every PHISH//OUT mission at a glance: level, type, skills, description and what it teaches.",
};

const TYPE: Record<Game["mode"], string> = {
  native: "In your tab",
  sandbox: "Real browser on our VM",
  terminal: "Real terminal on our VM",
};

/** Every mission in one table, Novice first, in level order. */
export default function GameInfoPage() {
  const all = [...games, endlessGame].map(game => ({
    game,
    level: game.slug === "endless" ? "expert" as const : levelOf(game.slug),
    learning: learningFor(game.slug),
  })).sort((a, b) => (a.level === b.level ? 0 : a.level === "novice" ? -1 : 1));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-4">
      <header className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Game info</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-soft">
          All {all.length} games at a glance. Clear every Novice mission (50+ XP each) to unlock Expert. “Real browser” missions fall back to an in-tab version when the VM is off.
        </p>
      </header>

      <div className="overflow-x-auto rounded-3xl bg-paper-raised">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-paper-deep text-ink-soft">
              <th scope="col" className="px-4 py-3 font-semibold">Game</th>
              <th scope="col" className="px-4 py-3 font-semibold">Level</th>
              <th scope="col" className="px-4 py-3 font-semibold">Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">Skills</th>
              <th scope="col" className="px-4 py-3 font-semibold">Description</th>
              <th scope="col" className="px-4 py-3 font-semibold">What it teaches</th>
            </tr>
          </thead>
          <tbody>
            {all.map(({ game, level, learning }) => (
              <tr key={game.slug} className="border-b border-paper-deep align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-left">
                  <Link href={`/games/${game.slug}`} className="font-bold hover:underline">{game.title}</Link>
                </th>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", level === "novice" ? "bg-brand-soft text-ink" : "bg-ink text-paper")}>{LEVELS[level].title}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{TYPE[game.mode]}</td>
                <td className="px-4 py-3 text-ink-soft">{learning?.skills.join(", ") ?? game.skill}</td>
                <td className="px-4 py-3">{game.blurb}</td>
                <td className="px-4 py-3 text-ink-soft">{learning?.takeaways[0] ?? game.objective}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
