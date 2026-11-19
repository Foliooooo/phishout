import { type Learning, sumEvidence } from "@/lib/learning";
import { games } from "@/lib/games";
import { getDatabase } from "@/lib/mongodb";

const minimumPlayers = 5;

export async function educatorEvidence() {
  const [cohort] = await getDatabase().collection("browser_attempts").aggregate<{ learners: number; skills: Learning }>([
    { $match: { slug: { $in: games.map(game => game.slug) }, learning: { $exists: true }, completedAt: { $type: "date" } } },
    { $sort: { completedAt: -1, _id: -1 } },
    { $group: { _id: { learner: "$userId", mission: "$slug" }, latest: { $first: "$learning" } } },
    { $facet: {
      cohort: [{ $group: { _id: "$_id.learner" } }, { $count: "learners" }],
      evidence: [{ $project: { _id: 0, latest: 1 } }, { $unwind: { path: "$latest.skills", includeArrayIndex: "index" } },
        { $group: { _id: "$index", found: { $sum: { $arrayElemAt: ["$latest.skills", 0] } },
          available: { $sum: { $arrayElemAt: ["$latest.skills", 1] } }, falseFlags: { $sum: { $arrayElemAt: ["$latest.skills", 2] } } } },
        { $sort: { _id: 1 } }],
    } },
    { $project: { learners: { $first: "$cohort.learners" }, skills: { skills: { $map: {
      input: "$evidence", as: "skill", in: ["$$skill.found", "$$skill.available", "$$skill.falseFlags"],
    } } } } },
    { $match: { learners: { $gte: minimumPlayers } } },
  ]).toArray();
  return cohort ? { learners: cohort.learners, evidence: sumEvidence([cohort.skills]) } : null;
}
