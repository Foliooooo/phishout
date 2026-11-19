import { scoringVersion } from "@/lib/game-scoring";
import { getDatabase } from "@/lib/mongodb";
import { parseLearning } from "@/lib/learning";

export async function saveSandboxScore(
  attempt: { _id: string; userId: string; sessionId: string },
  activity: { answer?: unknown; correct?: unknown; xp?: unknown; scoringVersion?: unknown; learning?: unknown } | null,
) {
  if (!Number.isInteger(activity?.answer) || typeof activity?.correct !== "boolean") return null;

  const xp = activity.xp;
  if (typeof xp !== "number" || !Number.isInteger(xp) || xp < 0 || xp > 100) return null;
  const score = { correct: activity.correct, xp };
  const learning = activity.scoringVersion === scoringVersion ? parseLearning(activity.learning) : undefined;
  await getDatabase().collection<{ _id: string }>("browser_attempts").updateOne(
    { ...attempt, completedAt: { $exists: false } },
    { $set: { completedAt: new Date(), ...score, ...(activity.scoringVersion === scoringVersion ? { scoringVersion } : {}), ...(learning ? { learning } : {}) } },
  );
  return score;
}
