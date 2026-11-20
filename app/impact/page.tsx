import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoader } from "@/components/ascii-canvas";
import { SkillBars } from "@/components/skill-bars";
import { buttonStyles } from "@/components/ui/button";
import { MIN_PLAYERS, productImpact } from "@/lib/impact";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Impact · PHISH OUT",
  description: "Live, measured results from PHISH//OUT: players, runs, improvement and the warning signs people miss most.",
};

const pct = (value: number) => `${Math.round(value * 100)}%`;
const n = (value: number) => value.toLocaleString("en-IN");

async function Impact() {
  await connection();
  const data = await productImpact();
  const early = data.players < MIN_PLAYERS;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-ink p-6 text-paper sm:p-10">
        <p className="font-mono text-sm font-bold text-brand">Impact · live</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Does it make people safer?</h1>
        <p className="mt-3 max-w-2xl text-lg text-paper/80">Every number on this page is counted from finished runs in our database, right now. Nothing is estimated or made up.</p>
        {early ? (
          <p className="mt-5 max-w-2xl rounded-2xl bg-caution/20 p-4 text-paper">
            <b>Early data.</b> Only {n(data.players)} {data.players === 1 ? "player has" : "players have"} finished a run so far. Treat these as a demo of what we measure, not as proof yet. Conclusions need at least {MIN_PLAYERS} players.
          </p>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-paper-deep sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Players", n(data.players)],
          ["Finished runs", n(data.runs)],
          ["Missions cleared", n(data.cleared)],
          ["Certificates", n(data.certificates)],
          ["LAN parties", n(data.parties)],
          ["Party players", n(data.partyPlayers)],
        ].map(([label, value]) => (
          <div key={label} className="bg-paper-raised p-5">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="replay" className="rounded-3xl bg-paper-raised p-6">
          <h2 id="replay" className="text-2xl font-bold">Practice pays off</h2>
          {data.improvement ? (
            <>
              <p className="mt-1 text-ink-soft">When a player replays a mission, how their first score compares with their best.</p>
              <p className="mt-5 flex items-baseline gap-3 font-mono text-5xl font-bold tabular-nums">
                {data.improvement.firstAverage}<span className="text-2xl text-ink-soft">→</span><span className="text-brand">{data.improvement.bestAverage}</span>
                <span className="text-lg text-ink-soft">XP</span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">Average over {n(data.improvement.pairs)} replayed {data.improvement.pairs === 1 ? "mission" : "missions"}. {n(data.improvement.improved)} of them improved. Every run is shuffled, so a better score means better habits, not a memorised answer key.</p>
            </>
          ) : <p className="mt-3 text-ink-soft">No one has replayed a mission yet.</p>}
        </section>

        <section aria-labelledby="catch" className="rounded-3xl bg-paper-raised p-6">
          <h2 id="catch" className="text-2xl font-bold">Warning signs caught</h2>
          {data.catchRate ? (
            <>
              <p className="mt-1 text-ink-soft">Share of real warning signs players flagged on their first measured run vs their most recent one.</p>
              <p className="mt-5 flex items-baseline gap-3 font-mono text-5xl font-bold tabular-nums">
                {pct(data.catchRate.first)}<span className="text-2xl text-ink-soft">→</span><span className="text-brand">{pct(data.catchRate.latest)}</span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">Across {n(data.catchRate.players)} {data.catchRate.players === 1 ? "player" : "players"} with two or more measured runs.</p>
            </>
          ) : <p className="mt-3 text-ink-soft">Needs players with two or more measured runs.</p>}
        </section>
      </div>

      <section aria-labelledby="skills" className="rounded-3xl bg-paper-raised p-6">
        <h2 id="skills" className="text-2xl font-bold">What people miss most</h2>
        <p className="mt-1 text-ink-soft">Share of warning signs of each kind that players did not flag, across every measured run.</p>
        <SkillBars skills={data.skills} className="mt-5" />
      </section>

      <section aria-labelledby="missions" className="rounded-3xl bg-paper-raised p-6">
        <h2 id="missions" className="text-2xl font-bold">Hardest missions</h2>
        <p className="mt-1 text-ink-soft">Lowest average score first. A mission is cleared at 50 XP or more.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead><tr className="text-ink-soft"><th className="py-2 pr-3 font-semibold">Mission</th><th className="py-2 pr-3 text-right font-semibold">Average XP</th><th className="py-2 pr-3 text-right font-semibold">Cleared</th><th className="py-2 pr-3 text-right font-semibold">Runs</th><th className="py-2 text-right font-semibold">Players</th></tr></thead>
            <tbody>
              {data.missions.map(mission => (
                <tr key={mission.slug} className="border-t border-paper-deep">
                  <td className="py-2.5 pr-3 font-semibold"><Link href={`/games/${mission.slug}`} className="hover:underline">{mission.title}</Link></td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{mission.averageXp}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{pct(mission.passRate)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{n(mission.runs)}</td>
                  <td className="py-2.5 text-right tabular-nums">{n(mission.players)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="method" className={cn("rounded-3xl bg-brand-soft p-6")}>
        <h2 id="method" className="text-2xl font-bold">How we measure</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink">
          <li>Scores are worked out on the server from what the player actually did, so they can’t be faked from the browser.</li>
          <li>Each mission has hidden warning signs. A sign counts as caught only if the player flags it; flagging normal details counts against them.</li>
          <li>Players are counted by account. Names and emails never appear here.</li>
          <li>Every run deals the situations, choices and clues in a new order, so improvement isn’t memorisation.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/for-teams" className={buttonStyles()}>Run it with your team</Link>
          <Link href="/architecture" className={buttonStyles({ variant: "raised" })}>How it works</Link>
        </div>
      </section>
    </div>
  );
}

export default function ImpactPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-8 sm:px-4">
      <Suspense fallback={<PageLoader label="counting runs" />}>
        <Impact />
      </Suspense>
    </main>
  );
}
