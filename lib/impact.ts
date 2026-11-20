import { games, endlessGame } from "@/lib/games";
import { parseLearning, skillNames, type Learning } from "@/lib/learning";
import { PASS_XP } from "@/lib/levels";
import { getDatabase } from "@/lib/mongodb";

/**
 * Measured, never estimated: every number here is counted from finished runs.
 * Below MIN_PLAYERS the pages say the data is too thin to draw conclusions.
 */
export const MIN_PLAYERS = 10;

export type Run = { userId: string; slug: string; completedAt: Date; xp?: number; learning?: unknown };

export type SkillStat = { skill: string; found: number; available: number; missRate: number | null };
export type MissionStat = { slug: string; title: string; runs: number; players: number; averageXp: number; passRate: number };

export type Insights = {
  players: number;
  runs: number;
  /** Per skill: clues of that kind found / available across all runs. */
  skills: SkillStat[];
  missions: MissionStat[];
  /** Players who replayed a mission: first run vs their best. */
  improvement: { pairs: number; improved: number; firstAverage: number; bestAverage: number } | null;
  /** Players with 2+ measured runs: share of warning signs caught on their first run vs their latest. */
  catchRate: { players: number; first: number; latest: number } | null;
};

const titleOf = (slug: string) => (slug === "endless" ? endlessGame.title : games.find(game => game.slug === slug)?.title ?? slug);
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const caught = (learning: Learning) => learning.skills.reduce((sum, [found, available]) => [sum[0] + found, sum[1] + available], [0, 0]);

export function insights(runs: Run[]): Insights {
  const sorted = runs.slice().sort((a, b) => +a.completedAt - +b.completedAt);
  const measured = sorted.map(run => ({ run, learning: parseLearning(run.learning) })).filter(item => item.learning) as { run: Run; learning: Learning }[];

  const skills = skillNames.map((skill, index) => {
    const [found, available] = measured.reduce((sum, { learning }) => [sum[0] + learning.skills[index][0], sum[1] + learning.skills[index][1]], [0, 0]);
    return { skill, found, available, missRate: available ? 1 - found / available : null };
  });

  const bySlug = new Map<string, Run[]>();
  for (const run of sorted) bySlug.set(run.slug, [...(bySlug.get(run.slug) ?? []), run]);
  const missions = [...bySlug.entries()].map(([slug, list]) => {
    const xps = list.map(run => (typeof run.xp === "number" ? run.xp : 0));
    return {
      slug, title: titleOf(slug), runs: list.length, players: new Set(list.map(run => run.userId)).size,
      averageXp: Math.round(average(xps)), passRate: xps.filter(xp => xp >= PASS_XP).length / xps.length,
    };
  }).sort((a, b) => a.averageXp - b.averageXp);

  // First run vs best run, per player and mission they replayed.
  const pairs = new Map<string, number[]>();
  for (const run of sorted) {
    if (typeof run.xp !== "number" || run.slug === "endless") continue;
    const key = `${run.userId}|${run.slug}`;
    pairs.set(key, [...(pairs.get(key) ?? []), run.xp]);
  }
  const replayed = [...pairs.values()].filter(list => list.length >= 2);
  const improvement = replayed.length ? {
    pairs: replayed.length,
    improved: replayed.filter(list => Math.max(...list.slice(1)) > list[0]).length,
    firstAverage: Math.round(average(replayed.map(list => list[0]))),
    bestAverage: Math.round(average(replayed.map(list => Math.max(...list)))),
  } : null;

  // Share of warning signs caught: each player’s first measured run vs their latest.
  const byPlayer = new Map<string, Learning[]>();
  for (const { run, learning } of measured) byPlayer.set(run.userId, [...(byPlayer.get(run.userId) ?? []), learning]);
  const repeat = [...byPlayer.values()].filter(list => list.length >= 2);
  const rate = (list: Learning[]) => { const [found, available] = list.map(caught).reduce((sum, item) => [sum[0] + item[0], sum[1] + item[1]], [0, 0]); return available ? found / available : 0; };
  const catchRate = repeat.length ? { players: repeat.length, first: rate(repeat.map(list => list[0])), latest: rate(repeat.map(list => list.at(-1)!)) } : null;

  return { players: new Set(sorted.map(run => run.userId)).size, runs: sorted.length, skills, missions, improvement, catchRate };
}

export async function productImpact() {
  const db = getDatabase();
  const [runs, certificates, parties] = await Promise.all([
    db.collection<Run>("browser_attempts").find({ completedAt: { $type: "date" } }, { projection: { _id: 0, userId: 1, slug: 1, completedAt: 1, xp: 1, learning: 1 } }).limit(20_000).toArray(),
    db.collection("certificates").countDocuments(),
    db.collection<{ members: unknown[] }>("parties").find({}, { projection: { members: 1 } }).toArray(),
  ]);
  return {
    ...insights(runs),
    certificates,
    parties: parties.length,
    partyPlayers: parties.reduce((sum, party) => sum + party.members.length, 0),
    cleared: new Set(runs.filter(run => (run.xp ?? 0) >= PASS_XP).map(run => `${run.userId}|${run.slug}`)).size,
  };
}
