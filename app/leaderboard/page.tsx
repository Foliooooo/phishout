import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageLoader } from "@/components/ascii-canvas";
import { Icon } from "@/components/missions/icon";
import { buttonStyles } from "@/components/ui/button";
import { games } from "@/lib/games";
import { loadLeaderboard, playerAlias } from "@/lib/leaderboard";
import { avatarUrl, getProfiles, type Profile } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { CrownWinnerKingIcon } from "@pikaicons/core-free";
import Image from "next/image";

export const metadata: Metadata = { title: "Leaderboard · PHISH OUT" };

type Leader = { _id: string; xp: number; missions: number; rank: number };

const MAX_XP = games.length * 100;
const PODIUM = [
  { place: 2, height: "h-24 sm:h-28", tone: "bg-paper-deep" },
  { place: 1, height: "h-32 sm:h-40", tone: "bg-brand text-on-brand" },
  { place: 3, height: "h-20 sm:h-20", tone: "bg-brand-soft" },
];

/** A small, stable, colourful mark per alias, so players are easy to tell apart. */
function Badge({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507) ^ (hash >>> 13);
  const hue = Math.abs(hash) % 360;
  const cells = Array.from({ length: 9 }, (_, index) => (Math.abs(hash >> index) & 1) === 1);
  return (
    <span aria-hidden className={cn("grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-xl p-1.5", className)} style={{ width: size, height: size, background: `hsl(${hue} 70% 92%)` }}>
      {cells.map((on, index) => <i key={index} className="rounded-[2px]" style={{ background: on ? `hsl(${hue} 65% 45%)` : "transparent" }} />)}
    </span>
  );
}

function name(row: Leader, userId: string | undefined, people: Map<string, Profile>) {
  const shown = people.get(row._id)?.displayName ?? playerAlias(row._id);
  return row._id === userId ? `${shown} (you)` : shown;
}

/** The player's uploaded photo, or their generated badge. */
function Face({ id, people, size, className }: { id: string; people: Map<string, Profile>; size: number; className?: string }) {
  const photo = avatarUrl(people.get(id));
  // eslint-disable-next-line @next/next/no-img-element -- user upload served from local storage
  if (photo) return <img src={photo} alt="" width={size} height={size} className={cn("shrink-0 rounded-xl object-cover", className)} style={{ width: size, height: size }} />;
  return <Badge id={id} size={size} className={className} />;
}

async function Standings() {
  await connection();
  const session = await auth();
  const userId = session?.user.id;
  const { leaders, personal, players } = await loadLeaderboard(userId);
  const people = await getProfiles([...leaders.map(row => row._id), ...(userId ? [userId] : [])]).catch(() => new Map<string, Profile>());
  const top = leaders.slice(0, 3);
  const ahead = personal && leaders.filter(row => row.rank < personal.rank).at(-1);
  // Share of ranked players with a lower total (ties share a rank, so this is a floor).
  const percentile = personal && players > 1 ? Math.round((100 * (players - personal.rank)) / players) : null;

  if (!leaders.length) {
    return (
      <section className="mt-6 rounded-3xl bg-paper-raised p-8 text-center">
        <Image src="/illustrations/phishout/shield-hook.svg" alt="" width={240} height={180} className="mx-auto" />
        <p className="mt-3 text-lg font-bold">No ranked scores yet.</p>
        <p className="mt-1 text-ink-soft">Finish a mission to claim the top spot.</p>
        <Link href="/games" className={cn(buttonStyles(), "mt-4")}>Browse missions</Link>
      </section>
    );
  }

  return (
    <>
      <section aria-label="Top three" className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
        {PODIUM.map(({ place, height, tone }) => {
          const row = top.find(item => item.rank === place) ?? top[place - 1];
          if (!row) return <div key={place} />;
          return (
            <div key={place} className="flex flex-col items-center text-center">
              {place === 1 && <Icon icon={CrownWinnerKingIcon} size={22} className="mb-1 text-brand" />}
              <Face id={row._id} people={people} size={place === 1 ? 56 : 44} />
              <p className={cn("mt-2 max-w-full truncate text-sm font-bold sm:text-base", row._id === userId && "text-brand")}>{name(row, userId, people)}</p>
              <p className="text-xs text-ink-soft tabular-nums sm:text-sm">{row.xp} XP</p>
              <div className={cn("mt-3 flex w-full items-start justify-center rounded-t-2xl pt-3 text-2xl font-bold tabular-nums sm:text-3xl", height, tone)}>
                {row.rank}
              </div>
            </div>
          );
        })}
      </section>

      {userId && (
        <section aria-label="Your standing" className="mt-6 rounded-3xl bg-paper-raised p-5 sm:p-6">
          {personal ? (
            <div className="flex flex-wrap items-center gap-4">
              <Face id={userId} people={people} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-soft">You are <b className="text-ink">{people.get(userId)?.displayName ?? playerAlias(userId)}</b> · <Link href="/profile" className="underline underline-offset-2">edit profile</Link></p>
                <p className="text-2xl font-bold tracking-tight">
                  #{personal.rank} <span className="text-base font-medium text-ink-soft">of {players} · {personal.xp} XP</span>
                </p>
                {percentile !== null && <p className="text-sm text-ink-soft">Ahead of {percentile}% of players</p>}
              </div>
              <div className="w-full sm:w-56">
                {ahead ? (
                  <>
                    <p className="text-sm text-ink-soft"><b className="text-ink">{ahead.xp - personal.xp} XP</b> to reach #{ahead.rank}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (personal.xp / ahead.xp) * 100)}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-bold">You’re at the top.</p>
                )}
                <Link href="/scores" className="mt-3 inline-block text-sm font-bold underline underline-offset-2">My scores</Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">Finish a mission to get ranked.</p>
              <Link href="/games" className={buttonStyles({ size: "sm" })}>Play</Link>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="standings" className="mt-6 rounded-3xl bg-paper-raised p-3 sm:p-5">
        <div className="flex items-baseline justify-between px-2 pb-2">
          <h2 id="standings" className="text-xl font-bold">Standings</h2>
          <p className="text-sm text-ink-soft">{players} {players === 1 ? "player" : "players"} · top {Math.min(50, leaders.length)}</p>
        </div>
        <ol className="divide-y divide-paper-deep">
          {leaders.map(row => {
            const self = row._id === userId;
            return (
              <li key={row._id} className={cn("grid grid-cols-[40px_auto_1fr_auto] items-center gap-3 rounded-2xl px-2 py-3", self && "bg-brand-soft")}>
                <span className="text-center font-bold tabular-nums">{row.rank}</span>
                <Face id={row._id} people={people} size={32} className="rounded-lg p-1" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-bold">
                    {name(row, userId, people)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="h-1.5 max-w-64 flex-1 overflow-hidden rounded-full bg-paper-deep">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${(row.xp / MAX_XP) * 100}%` }} />
                    </span>
                    <span className="hidden gap-0.5 sm:flex" aria-label={`${row.missions} of ${games.length} missions`}>
                      {games.map((game, index) => <i key={game.slug} className={cn("size-1.5 rounded-full", index < row.missions ? "bg-ink" : "bg-paper-deep")} />)}
                    </span>
                  </div>
                </div>
                <span className="text-right font-bold tabular-nums">{row.xp}<span className="ml-1 text-xs font-medium text-ink-soft">XP</span></span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:px-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Leaderboard</h1>
          <p className="mt-1 max-w-lg text-ink-soft">Your best score in each mission adds up. Equal totals share a rank. Players stay anonymous unless they set a display name.</p>
        </div>
      </header>
      <Suspense fallback={<PageLoader label="loading standings" className="mt-6" />}><Standings /></Suspense>
    </main>
  );
}
