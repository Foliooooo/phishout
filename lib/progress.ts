import { randomBytes } from "node:crypto";
import { games } from "@/lib/games";
import type { Learning } from "@/lib/learning";
import { BADGES, EXPERT_MISSIONS, NOVICE_MISSIONS, PASS_XP, isSuperAdmin, levelOf, type Level } from "@/lib/levels";
import { getDatabase } from "@/lib/mongodb";
import { getProfile } from "@/lib/profiles";
import { inPartyWith } from "@/lib/party";

type Row = { slug: string; completedAt: Date; xp?: number; learning?: Learning; hintsUsed?: number; display?: string };

export type EarnedBadge = { id: string; earnedAt: Date };

export type Progress = {
  admin: boolean;
  level: Level;
  expertUnlocked: boolean;
  certified: boolean;
  cleared: string[];
  best: Record<string, number>;
  novice: { done: number; total: number; left: string[] };
  expert: { done: number; total: number; left: string[] };
  totalXp: number;
  streak: { current: number; longest: number; playedToday: boolean };
  badges: EarnedBadge[];
};

const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
const dayNumber = (date: Date) => Math.round(Date.parse(day.format(date)) / 86_400_000);

/** Works out level, badges and streaks from a player’s completed runs, oldest first. */
export function computeProgress(rows: Row[], admin = false, now = new Date()): Progress {
  const sorted = rows.slice().sort((a, b) => +a.completedAt - +b.completedAt);
  const best: Record<string, number> = {};
  const cleared = new Set<string>();
  const failedOnce = new Set<string>();
  const earned = new Map<string, Date>();
  const award = (id: string, at: Date) => { if (!earned.has(id)) earned.set(id, at); };
  const days: number[] = [];
  let run = 0, longest = 0, previousDay: number | null = null;

  for (const row of sorted) {
    const xp = typeof row.xp === "number" ? row.xp : 0;
    const at = row.completedAt;
    const today = dayNumber(at);
    if (today !== previousDay) {
      run = previousDay !== null && today === previousDay + 1 ? run + 1 : 1;
      previousDay = today;
      days.push(today);
      longest = Math.max(longest, run);
      if (run >= 3) award("streak-3", at);
      if (run >= 7) award("streak-7", at);
      if (run >= 14) award("streak-14", at);
    }

    if (row.slug === "endless") { award("endless", at); continue; }
    if (!games.some(game => game.slug === row.slug)) continue;
    best[row.slug] = Math.max(best[row.slug] ?? 0, xp);

    const passed = xp >= PASS_XP;
    if (!passed) failedOnce.add(row.slug);
    if (passed) {
      if (failedOnce.has(row.slug) && !cleared.has(row.slug)) award("comeback", at);
      cleared.add(row.slug);
      if (!row.hintsUsed && row.display === "direct") award("no-coach", at);
      if (row.slug === "header-hunt" || row.slug === "payload-autopsy") award("terminal", at);
    }
    if (xp >= 100) award("perfect", at);
    if (row.learning) {
      const [found, available, falseFlags] = row.learning.skills.reduce((sum, [f, a, x]) => [sum[0] + f, sum[1] + a, sum[2] + x], [0, 0, 0]);
      if (available > 0 && found >= available && falseFlags === 0) award("sharp-eye", at);
    }

    if (cleared.size >= 1) award("first-catch", at);
    if (cleared.size >= 5) award("five-cleared", at);
    if (NOVICE_MISSIONS.every(slug => cleared.has(slug))) award("novice-graduate", at);
    if (games.every(game => cleared.has(game.slug))) award("expert", at);
    const total = Object.values(best).reduce((sum, value) => sum + value, 0);
    if (total >= 500) award("xp-500", at);
    if (total >= 1000) award("xp-1000", at);
  }

  // Super admins have everything done: every mission cleared, every badge, the certificate.
  if (admin) {
    for (const game of games) {
      cleared.add(game.slug);
      best[game.slug] = Math.max(best[game.slug] ?? 0, 100);
    }
    for (const badge of BADGES) award(badge.id, now);
  }

  const todayNumber = dayNumber(now);
  const last = days.at(-1);
  const current = last !== undefined && todayNumber - last <= 1 ? run : 0;
  const noviceLeft = NOVICE_MISSIONS.filter(slug => !cleared.has(slug));
  const expertLeft = EXPERT_MISSIONS.filter(slug => !cleared.has(slug));
  const noviceDone = noviceLeft.length === 0;

  return {
    admin,
    level: noviceDone ? "expert" : "novice",
    expertUnlocked: noviceDone || admin,
    certified: noviceDone && expertLeft.length === 0,
    cleared: [...cleared],
    best,
    novice: { done: NOVICE_MISSIONS.length - noviceLeft.length, total: NOVICE_MISSIONS.length, left: noviceLeft },
    expert: { done: EXPERT_MISSIONS.length - expertLeft.length, total: EXPERT_MISSIONS.length, left: expertLeft },
    totalXp: Object.values(best).reduce((sum, value) => sum + value, 0),
    streak: { current, longest, playedToday: last === todayNumber },
    badges: BADGES.filter(badge => earned.has(badge.id)).map(badge => ({ id: badge.id, earnedAt: earned.get(badge.id)! })),
  };
}

export async function getProgress(userId: string, email?: string | null) {
  const rows = await getDatabase().collection<Row & { userId: string }>("browser_attempts")
    .find({ userId, completedAt: { $type: "date" } }, { projection: { _id: 0, slug: 1, completedAt: 1, xp: 1, learning: 1, hintsUsed: 1, display: 1 } })
    .sort({ completedAt: 1 }).limit(2000).toArray();
  return computeProgress(rows, isSuperAdmin(email));
}

/** Whether a mission is open to this player. Novice is always open; Expert and Endless need Novice cleared. */
export function canPlay(progress: Pick<Progress, "expertUnlocked">, slug: string) {
  if (slug === "endless") return progress.expertUnlocked;
  return levelOf(slug) === "novice" || progress.expertUnlocked;
}

export const lockedMessage = "Clear every Novice mission (50+ XP each) to unlock Expert missions.";

/** Server check used by the mission APIs. */
export async function missionLocked(userId: string, email: string | null | undefined, slug: string) {
  if (isSuperAdmin(email)) return false;
  if (slug !== "endless" && levelOf(slug) === "novice") return false;
  if (canPlay(await getProgress(userId, email), slug)) return false;
  // An open LAN party opens its missions to every member.
  return !await inPartyWith(userId, slug);
}

export type Certificate = {
  _id: string;
  userId: string;
  name: string;
  issuedAt: Date;
  totalXp: number;
  missions: number;
};

const certificates = () => getDatabase().collection<Certificate>("certificates");

/** Issues (or refreshes the name on) a player’s certificate. Only for players who cleared everything. */
export async function issueCertificate(userId: string, progress: Progress) {
  if (!progress.certified) return null;
  const profile = await getProfile(userId);
  const name = profile?.displayName?.trim() || "PHISH//OUT player";
  const existing = await certificates().findOne({ userId });
  if (existing) {
    if (existing.name !== name || existing.totalXp !== progress.totalXp) {
      await certificates().updateOne({ _id: existing._id }, { $set: { name, totalXp: progress.totalXp } });
    }
    return { ...existing, name, totalXp: progress.totalXp };
  }
  const certificate: Certificate = {
    _id: randomBytes(6).toString("hex").toUpperCase(),
    userId, name, issuedAt: new Date(), totalXp: progress.totalXp, missions: progress.cleared.length,
  };
  await certificates().createIndex({ userId: 1 }, { unique: true });
  try {
    await certificates().insertOne(certificate);
    return certificate;
  } catch {
    return certificates().findOne({ userId });
  }
}

export async function findCertificate(id: string) {
  if (!/^[0-9A-F]{12}$/.test(id)) return null;
  return certificates().findOne({ _id: id });
}
