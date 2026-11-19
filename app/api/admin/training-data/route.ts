import { cookies } from "next/headers";
import { adminSessionCookie, hasAdminSession } from "@/lib/admin";
import { getDatabase } from "@/lib/mongodb";
import { buildFeatures } from "@/lib/prediction";
import type { Learning } from "@/lib/learning";

type Attempt = { userId: string; slug: string; completedAt: Date; learning: Learning };

/**
 * Training data for the custom prediction model, as JSON Lines (admin only).
 *
 * One example per completed run after a player’s first: the features describe
 * everything the player did before that run, and the label is what happened
 * in it (clues missed per skill, decisions right). No user IDs are included.
 */
export async function GET() {
  if (!await hasAdminSession((await cookies()).get(adminSessionCookie)?.value)) {
    return new Response(null, { status: 404 });
  }
  const attempts = await getDatabase().collection<Attempt>("browser_attempts")
    .find({ completedAt: { $type: "date" }, learning: { $exists: true } }, { projection: { userId: 1, slug: 1, completedAt: 1, learning: 1 } })
    .sort({ userId: 1, completedAt: 1 }).toArray();

  const byPlayer = new Map<string, Attempt[]>();
  for (const attempt of attempts) byPlayer.set(attempt.userId, [...(byPlayer.get(attempt.userId) ?? []), attempt]);

  const lines: string[] = [];
  for (const runs of byPlayer.values()) {
    for (let index = 1; index < runs.length; index += 1) {
      const next = runs[index];
      lines.push(JSON.stringify({
        features: buildFeatures(runs.slice(0, index), next.completedAt),
        label: {
          mission: next.slug,
          skills: next.learning.skills.map(([found, available]) => ({ missed: available - found, available })),
          right: next.learning.right,
          decisions: next.learning.decisions,
        },
      }));
    }
  }
  return new Response(lines.join("\n") + (lines.length ? "\n" : ""), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"phishout-training.jsonl\"",
      "Cache-Control": "no-store",
    },
  });
}
