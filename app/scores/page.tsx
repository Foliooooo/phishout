import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { buttonStyles } from "@/components/ui/button";
import { scoringVersion } from "@/lib/game-scoring";
import { getGame, games } from "@/lib/games";
import { loadLeaderboard } from "@/lib/leaderboard";
import { getDatabase } from "@/lib/mongodb";
import { practiceBriefs } from "@/lib/practice-briefs";
import { predictForPlayer } from "@/lib/prediction";
import { getProgress } from "@/lib/progress";
import { BadgeGrid, LevelCard, StreakCard } from "@/components/progress";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ascii-canvas";
import Image from "next/image";

export const metadata: Metadata = { title: "Scores & badges · PHISH OUT" };

type Completion = { _id: string; userId: string; slug: string; completedAt: Date; correct: boolean; xp: number; scoringVersion?: number };

const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

function riskLabel(risk: number) {
  if (risk < 25) return { label: "Low risk", tone: "bg-safe" };
  if (risk < 50) return { label: "Some risk", tone: "bg-caution" };
  return { label: "High risk", tone: "bg-danger" };
}

async function Scores() {
  await connection();
  const session = await auth();
  if (!session?.user.id || !session.sessionId) redirect("/sign-in?next=%2Fscores");
  const userId = session.user.id;

  const attempts = getDatabase().collection<Completion>("browser_attempts");
  const filter = { userId, completedAt: { $type: "date" as const } };
  const [best, recent, { prediction }, { personal }, featured, progress] = await Promise.all([
    attempts.aggregate<{ _id: string; best: number; plays: number }>([
      { $match: { ...filter, scoringVersion } },
      { $group: { _id: "$slug", best: { $max: "$xp" }, plays: { $sum: 1 } } },
    ]).toArray(),
    attempts.find(filter).sort({ completedAt: -1 }).limit(5).toArray(),
    predictForPlayer(userId),
    loadLeaderboard(userId),
    practiceBriefs().findOne({ _id: "featured" }),
    getProgress(userId, session.user.email),
  ]);
  const byMission = new Map(best.map(score => [score._id, score]));
  const total = games.reduce((sum, game) => sum + (byMission.get(game.slug)?.best ?? 0), 0);
  const completed = games.filter(game => byMission.has(game.slug)).length;
  const next = prediction ? getGame(prediction.next) : games.find(game => !byMission.has(game.slug));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Scores &amp; badges</h1>
          <p className="mt-1 text-ink-soft">Your best run in each mission counts towards your total.</p>
        </div>
        <Link href="/leaderboard" className={buttonStyles({ variant: "secondary", size: "sm" })}>Leaderboard</Link>
      </header>

      <dl className="grid grid-cols-3 overflow-hidden rounded-3xl bg-paper-raised">
        {[
          ["Total XP", String(total)],
          ["Missions", `${completed}/${games.length}`],
          ["Rank", personal ? `#${personal.rank}` : "–"],
        ].map(([label, value], index) => (
          <div key={label} className={cn("p-5 sm:p-6", index > 0 && "border-l border-paper-deep")}>
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      <LevelCard progress={progress} />
      <StreakCard progress={progress} />
      <BadgeGrid progress={progress} />

      <section aria-labelledby="risk" className="rounded-3xl bg-paper-raised p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="risk" className="text-xl font-bold">Where you’re likely to slip</h2>
          {prediction && (
            <span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-bold text-ink-soft">
              {prediction.source === "custom" ? "Custom model" : "Baseline estimate"}
            </span>
          )}
        </div>
        {prediction ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={cn("rounded-full px-3 py-1 text-sm font-bold text-on-brand", riskLabel(prediction.risk).tone)}>{riskLabel(prediction.risk).label}</span>
              <span className="text-sm text-ink-soft">Estimated {prediction.risk}% chance a phish gets past you right now.</span>
            </div>
            <ul className="mt-5 space-y-3">
              {prediction.skills.map(skill => (
                <li key={skill.skill} className="grid grid-cols-[96px_1fr_48px] items-center gap-3 text-sm">
                  <span className="font-bold">{skill.skill}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-paper-deep" title={`${skill.confidence} confidence`}>
                    <span className={cn("block h-full rounded-full", skill.missChance >= 0.5 ? "bg-danger" : skill.missChance >= 0.25 ? "bg-caution" : "bg-safe", skill.confidence === "low" && "opacity-50")} style={{ width: `${Math.max(4, skill.missChance * 100)}%` }} />
                  </span>
                  <span className="text-right text-ink-soft tabular-nums">{Math.round(skill.missChance * 100)}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">Chance of missing that kind of warning sign next time. Faded bars have little data so far.</p>
          </>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Image src="/illustrations/phishout/shield-hook.svg" alt="" width={160} height={120} />
            <p className="max-w-sm text-ink-soft">Finish a mission and we’ll estimate where phishing is most likely to catch you.</p>
          </div>
        )}
        {next && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-paper-deep pt-5">
            <p className="text-sm"><span className="text-ink-soft">Practise next:</span> <b>{next.title}</b></p>
            <Link href={`/games/${next.slug}/play`} className={buttonStyles({ size: "sm" })}>Play</Link>
          </div>
        )}
        {featured?.published && (
          <p className="mt-4 text-sm text-ink-soft">
            Featured: <Link href={`/games/${featured.published.slug}`} className="font-bold text-ink underline underline-offset-2">{featured.published.title}</Link>. {featured.published.objective}
          </p>
        )}
      </section>

      <section aria-labelledby="missions" className="rounded-3xl bg-paper-raised p-5 sm:p-6">
        <h2 id="missions" className="text-xl font-bold">Missions</h2>
        <ul className="mt-3 divide-y divide-paper-deep">
          {games.map(game => {
            const score = byMission.get(game.slug);
            return (
              <li key={game.slug}>
                <Link href={`/games/${game.slug}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[200px_1fr_90px]">
                  <span className="font-bold">{game.title}</span>
                  <span className="order-3 col-span-2 h-1.5 overflow-hidden rounded-full bg-paper-deep sm:order-none sm:col-span-1">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${score?.best ?? 0}%` }} />
                  </span>
                  <span className="text-right text-sm text-ink-soft tabular-nums">{score ? `${score.best} XP` : "Not played"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="recent" className="rounded-3xl bg-paper-raised p-5 sm:p-6">
        <h2 id="recent" className="text-xl font-bold">Recent</h2>
        {recent.length ? (
          <ul className="mt-3 divide-y divide-paper-deep">
            {recent.map(attempt => (
              <li key={attempt._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <b>{getGame(attempt.slug)?.title ?? attempt.slug}</b>
                  <span className="ml-2 text-ink-soft">{date.format(attempt.completedAt)}</span>
                </span>
                <span className="text-ink-soft tabular-nums">
                  {attempt.correct ? "Safe" : attempt.xp > 0 ? "Partial" : "Missed"} · <b className="text-ink">{attempt.xp} XP</b>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <p className="text-ink-soft">Nothing yet.</p>
            <Link href="/games" className={cn(buttonStyles({ size: "sm" }), "mt-3")}>Browse missions</Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:px-4">
      <Suspense fallback={<PageLoader label="loading scores" />}>
        <Scores />
      </Suspense>
    </main>
  );
}
