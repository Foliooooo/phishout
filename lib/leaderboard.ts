import { createHash } from "node:crypto";
import { games } from "@/lib/games";
import { scoringVersion } from "@/lib/game-scoring";
import { getDatabase } from "@/lib/mongodb";

type Leader = { _id: string; xp: number; missions: number; rank: number };

export function playerAlias(userId: string) {
  return `Player ${createHash("sha256").update(userId).digest("hex").slice(0, 8).toUpperCase()}`;
}

export async function loadLeaderboard(userId?: string) {
  const [result] = await getDatabase().collection("browser_attempts").aggregate<{ leaders: Leader[]; personal: Leader[]; total: { players: number }[] }>([
    { $match: { scoringVersion, slug: { $in: games.map(game => game.slug) }, completedAt: { $type: "date" }, xp: { $gte: 0, $lte: 100 } } },
    { $group: { _id: { user: "$userId", mission: "$slug" }, best: { $max: "$xp" } } },
    { $group: { _id: "$_id.user", xp: { $sum: "$best" }, missions: { $sum: 1 } } },
    { $setWindowFields: { sortBy: { xp: -1 }, output: { rank: { $rank: {} } } } },
    { $sort: { rank: 1, missions: -1, _id: 1 } },
    { $facet: { leaders: [{ $limit: 50 }], personal: [{ $match: { _id: userId ?? null } }, { $limit: 1 }], total: [{ $count: "players" }] } },
  ]).toArray();
  return { leaders: result?.leaders ?? [], personal: result?.personal[0], players: result?.total[0]?.players ?? 0 };
}
