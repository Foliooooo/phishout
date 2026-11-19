import { games } from "@/lib/games";
import { skillNames, type Learning } from "@/lib/learning";
import { getDatabase } from "@/lib/mongodb";

/**
 * Predictive layer: "how likely is this player to miss a warning sign of each
 * kind next time?"
 *
 * If PREDICTION_MODEL_URL is set, the features are POSTed to that service (your
 * custom model, see /model) and its answer is used. Otherwise, or if it fails,
 * a transparent baseline runs here: a Beta(1, 1) posterior over each skill’s
 * miss rate, weighting recent runs more heavily.
 */

export type SkillFeature = { skill: string; found: number; available: number; falseFlags: number; recentMissRate: number | null };

export type PlayerFeatures = {
  version: 1;
  runs: number;
  missions: number;
  decisionAccuracy: number | null;
  falseFlagRate: number | null;
  daysSinceLastRun: number | null;
  skills: SkillFeature[];
};

export type Prediction = {
  source: "custom" | "baseline";
  /** 0–100: overall chance of being caught by the next phish, roughly. */
  risk: number;
  skills: { skill: string; missChance: number; confidence: "low" | "medium" | "high" }[];
  /** Mission that best targets the riskiest skill. */
  next: string;
};

type Attempt = { slug: string; completedAt: Date; learning?: Learning };

/** Which missions exercise which skills, read from completed runs’ learning data. */
const SKILL_MISSIONS: Record<string, string[]> = {
  Sender: ["inbox-trap", "whos-the-boss", "tick-tock"],
  Links: ["link-inspector", "spot-the-lookalike", "double-trouble", "crush-switch"],
  Urgency: ["tick-tock", "inbox-trap"],
  Authority: ["whos-the-boss", "popup-panic"],
  Requests: ["inbox-trap", "popup-panic", "double-trouble", "tick-tock"],
  Attachments: ["download-roulette"],
  Trust: ["crush-switch", "spot-the-lookalike", "link-inspector"],
};

export function buildFeatures(attempts: Attempt[], now = new Date()): PlayerFeatures {
  const measured = attempts.filter(attempt => attempt.learning).sort((a, b) => +a.completedAt - +b.completedAt);
  const recent = measured.slice(-5);
  const skills = skillNames.map((skill, index) => {
    const sum = measured.reduce((total, attempt) => {
      const [found, available, falseFlags] = attempt.learning!.skills[index];
      return [total[0] + found, total[1] + available, total[2] + falseFlags];
    }, [0, 0, 0]);
    const recentSum = recent.reduce((total, attempt) => {
      const [found, available] = attempt.learning!.skills[index];
      return [total[0] + found, total[1] + available];
    }, [0, 0]);
    return {
      skill, found: sum[0], available: sum[1], falseFlags: sum[2],
      recentMissRate: recentSum[1] ? 1 - recentSum[0] / recentSum[1] : null,
    };
  });
  const right = measured.reduce((total, attempt) => total + attempt.learning!.right, 0);
  const decisions = measured.reduce((total, attempt) => total + attempt.learning!.decisions, 0);
  const flags = skills.reduce((total, skill) => total + skill.found + skill.falseFlags, 0);
  const falseFlags = skills.reduce((total, skill) => total + skill.falseFlags, 0);
  const last = measured.at(-1)?.completedAt;
  return {
    version: 1,
    runs: measured.length,
    missions: new Set(measured.map(attempt => attempt.slug)).size,
    decisionAccuracy: decisions ? right / decisions : null,
    falseFlagRate: flags ? falseFlags / flags : null,
    daysSinceLastRun: last ? Math.round((+now - +last) / 86_400_000) : null,
    skills,
  };
}

export function baselinePrediction(features: PlayerFeatures): Prediction {
  const skills = features.skills.map(skill => {
    // Recent runs count double: blend the all-time and recent miss rates.
    const allTime = (skill.available - skill.found + 1) / (skill.available + 2);
    const missChance = skill.recentMissRate === null ? allTime : (allTime + 2 * skill.recentMissRate) / 3;
    const confidence: "low" | "medium" | "high" = skill.available >= 8 ? "high" : skill.available >= 3 ? "medium" : "low";
    return { skill: skill.skill, missChance: Math.round(missChance * 100) / 100, confidence };
  });
  const decisionMiss = features.decisionAccuracy === null ? 0.5 : 1 - features.decisionAccuracy;
  const clueMiss = skills.reduce((total, skill) => total + skill.missChance, 0) / skills.length;
  const risk = Math.round(100 * (0.6 * decisionMiss + 0.4 * clueMiss));
  return { source: "baseline", risk, skills, next: nextMission(skills) };
}

function nextMission(skills: Prediction["skills"]) {
  const worst = [...skills].sort((a, b) => b.missChance - a.missChance)[0];
  return SKILL_MISSIONS[worst.skill]?.[0] ?? games[0].slug;
}

function validPrediction(value: unknown): Omit<Prediction, "source"> | null {
  if (!value || typeof value !== "object") return null;
  const { risk, skills, next } = value as Partial<Prediction>;
  if (typeof risk !== "number" || risk < 0 || risk > 100) return null;
  if (!Array.isArray(skills) || skills.length !== skillNames.length) return null;
  const parsed = skills.map((item, index) => ({
    skill: skillNames[index],
    missChance: typeof item?.missChance === "number" ? Math.min(1, Math.max(0, item.missChance)) : NaN,
    confidence: ["low", "medium", "high"].includes(item?.confidence) ? item.confidence : "low",
  }));
  if (parsed.some(item => Number.isNaN(item.missChance))) return null;
  return { risk: Math.round(risk), skills: parsed, next: typeof next === "string" && games.some(game => game.slug === next) ? next : nextMission(parsed) };
}

export async function predict(features: PlayerFeatures): Promise<Prediction> {
  const url = process.env.PREDICTION_MODEL_URL?.trim();
  if (url) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.PREDICTION_MODEL_TOKEN ? { Authorization: `Bearer ${process.env.PREDICTION_MODEL_TOKEN}` } : {}) },
        body: JSON.stringify(features),
        signal: AbortSignal.timeout(3_000),
      });
      const parsed = response.ok ? validPrediction(await response.json()) : null;
      if (parsed) return { source: "custom", ...parsed };
      console.warn("Prediction model returned an invalid answer; using the baseline.");
    } catch (error) {
      console.warn("Prediction model unreachable; using the baseline.", error instanceof Error ? error.message : error);
    }
  }
  return baselinePrediction(features);
}

export async function predictForPlayer(userId: string) {
  const attempts = await getDatabase().collection<Attempt & { userId: string }>("browser_attempts")
    .find({ userId, completedAt: { $type: "date" }, learning: { $exists: true } }, { projection: { slug: 1, completedAt: 1, learning: 1 } })
    .sort({ completedAt: 1 }).limit(200).toArray();
  const features = buildFeatures(attempts);
  return { features, prediction: features.runs ? await predict(features) : null };
}
