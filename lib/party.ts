import { randomInt } from "node:crypto";
import { endlessGame, games } from "@/lib/games";
import { playerAlias } from "@/lib/leaderboard";
import { PASS_XP } from "@/lib/levels";
import { getDatabase } from "@/lib/mongodb";
import { avatarUrl, getProfiles } from "@/lib/profiles";

/**
 * LAN parties: a host opens a room with a short code, everyone at the event
 * joins it, and the room ranks the runs its members finish while it is open.
 * Party missions are open to every member, whatever their level.
 */

export type Party = {
  _id: string; // the join code
  name: string;
  hostId: string;
  missions: string[];
  members: { userId: string; joinedAt: Date }[];
  createdAt: Date;
  endsAt: Date;
};

export type PartyRow = {
  rank: number;
  name: string;
  avatar: string | null;
  score: number;
  xp: number;
  cleared: number;
  runs: number;
  lastAt: string | null;
  you: boolean;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export const DURATIONS = [1, 2, 4, 8] as const;
export const MAX_MEMBERS = 200;

/** Missions a party can include: every mission plus Endless mode. */
export const partyMissions = [...games, endlessGame];

export const parties = () => getDatabase().collection<Party>("parties");

export function normalizeCode(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  return CODE.test(code) ? code : null;
}

export const isOpen = (party: Pick<Party, "endsAt">, now = new Date()) => party.endsAt > now;

export async function createParty(hostId: string, name: string, missions: string[], hours: number) {
  const now = new Date();
  const chosen = missions.filter(slug => partyMissions.some(game => game.slug === slug));
  for (let tries = 0; tries < 5; tries += 1) {
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    try {
      await parties().insertOne({
        _id: code, name, hostId, missions: chosen,
        members: [{ userId: hostId, joinedAt: now }],
        createdAt: now, endsAt: new Date(now.getTime() + hours * 3600_000),
      });
      return code;
    } catch {
      // Code already taken: try another.
    }
  }
  throw new Error("Couldn’t create a party code");
}

export async function getParty(code: string) {
  return parties().findOne({ _id: code });
}

/** Adds the player to an open party. Returns false if it’s closed, full or missing. */
export async function joinParty(code: string, userId: string) {
  const now = new Date();
  const result = await parties().updateOne(
    { _id: code, endsAt: { $gt: now }, "members.userId": { $ne: userId }, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } },
    { $push: { members: { userId, joinedAt: now } } },
  );
  if (result.modifiedCount) return true;
  return Boolean(await parties().findOne({ _id: code, endsAt: { $gt: now }, "members.userId": userId }));
}

export async function endParty(code: string, hostId: string) {
  await parties().updateOne({ _id: code, hostId, endsAt: { $gt: new Date() } }, { $set: { endsAt: new Date() } });
}

/** True when the player is in an open party that includes this mission. */
export async function inPartyWith(userId: string, slug: string) {
  return Boolean(await parties().findOne({ "members.userId": userId, missions: slug, endsAt: { $gt: new Date() } }, { projection: { _id: 1 } }));
}

/** The player’s open parties, newest first. */
export async function myParties(userId: string) {
  return parties().find({ "members.userId": userId, endsAt: { $gt: new Date() } }, { sort: { createdAt: -1 }, limit: 5 }).toArray();
}

type Attempt = { userId: string; slug: string; completedAt: Date; xp?: number; arcade?: number };

/**
 * The party leaderboard: each member’s best run per party mission, played
 * while the party is open. Score is the arcade score (or 10× XP for missions
 * without one), so every mission counts on the same scale.
 */
export async function partyLeaderboard(party: Party, viewerId?: string | null): Promise<PartyRow[]> {
  const ids = party.members.map(member => member.userId);
  const attempts = await getDatabase().collection<Attempt>("browser_attempts")
    .find(
      { userId: { $in: ids }, slug: { $in: party.missions }, completedAt: { $gte: party.createdAt, $lte: party.endsAt } },
      { projection: { _id: 0, userId: 1, slug: 1, completedAt: 1, xp: 1, arcade: 1 } },
    ).toArray();

  const byUser = new Map<string, { best: Map<string, { score: number; xp: number }>; runs: number; lastAt: Date | null }>();
  for (const id of ids) byUser.set(id, { best: new Map(), runs: 0, lastAt: null });
  for (const attempt of attempts) {
    const entry = byUser.get(attempt.userId);
    if (!entry) continue;
    const xp = typeof attempt.xp === "number" ? attempt.xp : 0;
    const score = typeof attempt.arcade === "number" ? attempt.arcade : xp * 10;
    const previous = entry.best.get(attempt.slug);
    entry.best.set(attempt.slug, { score: Math.max(previous?.score ?? 0, score), xp: Math.max(previous?.xp ?? 0, xp) });
    entry.runs += 1;
    if (!entry.lastAt || attempt.completedAt > entry.lastAt) entry.lastAt = attempt.completedAt;
  }

  const profiles = await getProfiles(ids);
  const rows = [...byUser.entries()].map(([userId, entry]) => {
    const best = [...entry.best.values()];
    const profile = profiles.get(userId);
    return {
      userId,
      name: profile?.displayName?.trim() || playerAlias(userId),
      avatar: avatarUrl(profile),
      score: best.reduce((sum, item) => sum + item.score, 0),
      xp: best.reduce((sum, item) => sum + item.xp, 0),
      cleared: best.filter(item => item.xp >= PASS_XP).length,
      runs: entry.runs,
      lastAt: entry.lastAt?.toISOString() ?? null,
    };
  }).sort((a, b) => b.score - a.score || b.xp - a.xp || a.name.localeCompare(b.name));

  let rank = 0, previous: number | null = null;
  return rows.map((row, index) => {
    if (row.score !== previous) { rank = index + 1; previous = row.score; }
    return { rank, name: row.name, avatar: row.avatar, score: row.score, xp: row.xp, cleared: row.cleared, runs: row.runs, lastAt: row.lastAt, you: row.userId === viewerId };
  });
}
