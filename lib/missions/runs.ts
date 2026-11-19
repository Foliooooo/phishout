import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/mongodb";
import { parseLearning } from "@/lib/learning";
import { actCrush, newCrushState, scoreCrush, viewCrush, type CrushEvent, type CrushState } from "./crush";
import { actMission, endlessSite, newMissionState, sceneMissions, scoreMission, viewMission, type MissionEvent, type MissionState, type Scene } from "./engine";
import { generateEndlessMission } from "./generate";
import type { MissionReport } from "./ai";
import type { MissionView } from "./types";

/**
 * Runs of the in-app games. State lives in `mission_runs`; every run also has
 * a `browser_attempts` record (display "direct") so My scores, the
 * leaderboard and the educator view count it like a sandbox run.
 */

type Owner = { userId: string; sessionId: string };

type Run = Owner & {
  _id: string;
  slug: string;
  state: MissionState | CrushState;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  /** AI-coach hints used, by situation index. Recorded, never scored. */
  hints?: Record<string, number>;
  /** Gemini-written situations for an Endless run. */
  custom?: Scene[];
  report?: MissionReport;
};

export const directMissions = new Set([...sceneMissions, "crush-switch", "endless"]);

export class GenerationLimited extends Error {}

const runs = () => getDatabase().collection<Run>("mission_runs");
const attempts = () => getDatabase().collection<{ _id: string }>("browser_attempts");

const isCrush = (slug: string) => slug === "crush-switch";

export function view(run: Pick<Run, "slug" | "state" | "custom">): MissionView {
  return isCrush(run.slug)
    ? viewCrush(run.state as CrushState)
    : viewMission(run.slug, run.state as MissionState, run.custom, run.custom ? endlessSite : undefined);
}

function score(run: Pick<Run, "slug" | "state" | "custom">) {
  return isCrush(run.slug) ? scoreCrush(run.state as CrushState) : scoreMission(run.slug, run.state as MissionState, run.custom);
}

/** Resumes the player's unfinished run of this mission, or opens a new one. */
export async function openRun(owner: Owner, slug: string, fresh: boolean, unlimited = false) {
  const now = new Date();
  if (!fresh) {
    const active = await runs().findOne(
      { userId: owner.userId, slug, completedAt: { $exists: false }, updatedAt: { $gt: new Date(now.getTime() - 12 * 3600_000) } },
      { sort: { updatedAt: -1 } },
    );
    if (active) return active;
  }
  let custom: Scene[] | undefined;
  if (slug === "endless") {
    // One generation per player every 30 seconds keeps Gemini costs sane.
    const limits = getDatabase().collection<{ _id: string; next: number }>("generation_limits");
    await limits.updateOne({ _id: owner.userId }, { $setOnInsert: { next: 0 } }, { upsert: true });
    const allowed = await limits.updateOne({ _id: owner.userId, next: { $lte: now.getTime() } }, { $set: { next: now.getTime() + 30_000 } });
    if (!allowed.modifiedCount && !unlimited) throw new GenerationLimited("Wait a few seconds before generating another mission.");
    custom = await generateEndlessMission();
  }
  const run: Run = {
    _id: randomUUID(), ...owner, slug, ...(custom ? { custom } : {}),
    state: isCrush(slug) ? newCrushState() : newMissionState(),
    rev: 0, createdAt: now, updatedAt: now,
  };
  await runs().insertOne(run);
  await attempts().insertOne({
    _id: run._id, ...owner, slug, openedAt: now, display: "direct", outcome: "direct_live",
  } as { _id: string });
  await getDatabase().collection<{ _id: string }>("accounts").updateOne({ _id: owner.userId }, { $max: { lastSeenAt: now } });
  return run;
}

export async function loadRun(userId: string, runId: string, slug: string) {
  return runs().findOne({ _id: runId, userId, slug });
}

/**
 * Applies an event with optimistic concurrency, so double clicks and
 * duplicate requests can never advance a mission twice.
 */
export async function applyEvent(run: Run, event: MissionEvent | CrushEvent) {
  for (let tries = 0; tries < 3; tries += 1) {
    const before = score(run);
    const state = isCrush(run.slug)
      ? actCrush(run.state as CrushState, event as CrushEvent)
      : actMission(run.slug, run.state as MissionState, event as MissionEvent, run.custom);
    if (state === run.state) return { run, saved: null };

    const now = new Date();
    const after = score({ slug: run.slug, state, custom: run.custom });
    const finishing = !before && after;
    const update = await runs().findOneAndUpdate(
      { _id: run._id, rev: run.rev },
      { $set: { state, updatedAt: now, ...(finishing ? { completedAt: now } : {}) }, $inc: { rev: 1 } },
      { returnDocument: "after" },
    );
    if (update) {
      let saved = null;
      const ranked = !isCrush(run.slug) || (state as CrushState).original === null;
      if (finishing && after && ranked) {
        saved = { xp: after.xp, correct: after.correct };
        const learning = parseLearning(after.learning);
        await attempts().updateOne(
          { _id: run._id, userId: run.userId, completedAt: { $exists: false } },
          {
            $set: {
              completedAt: now, closedAt: now, outcome: "direct_complete", answer: after.answer,
              correct: after.correct, xp: after.xp, scoringVersion: after.scoringVersion,
              ...(learning ? { learning } : {}),
            },
          },
        );
      }
      if (isCrush(run.slug) && !ranked && (state as CrushState).ending === null) {
        // A rewind reopens the run for an unranked replay.
        await runs().updateOne({ _id: run._id }, { $unset: { completedAt: "" } });
      }
      return { run: update, saved };
    }
    const latest = await runs().findOne({ _id: run._id });
    if (!latest) break;
    run = latest;
  }
  return { run, saved: null };
}

export async function recordHint(runId: string, step: number) {
  await runs().updateOne({ _id: runId }, { $inc: { [`hints.${step}`]: 1 } });
  await attempts().updateOne({ _id: runId }, { $inc: { hintsUsed: 1 } });
}

export async function saveReport(runId: string, report: MissionReport) {
  await runs().updateOne({ _id: runId, report: { $exists: false } }, { $set: { report } });
  await attempts().updateOne({ _id: runId }, { $set: { report } });
}
