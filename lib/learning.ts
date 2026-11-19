export const skillNames = ["Sender", "Links", "Urgency", "Authority", "Requests", "Attachments", "Trust"] as const;

export type Evidence = [found: number, available: number, falseFlags: number];
export type Learning = { skills: Evidence[]; right: number; decisions: number };

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

export function parseLearning(value: unknown): Learning | undefined {
  if (!value || typeof value !== "object") return;
  const { skills, right, decisions } = value as Partial<Learning>;
  if (!count(right) || !count(decisions) || decisions < 1 || right > decisions) return;
  if (!Array.isArray(skills) || skills.length !== skillNames.length || !skills.every(skill =>
    Array.isArray(skill) && skill.length === 3 && skill.every(count) && skill[0] <= skill[1],
  )) return;
  return { skills, right, decisions };
}

export function sumEvidence(results: Learning[]): Evidence[] {
  return skillNames.map((_, index) => results.reduce<Evidence>((total, result) => {
    const [found, available, falseFlags] = result.skills[index];
    return [total[0] + found, total[1] + available, total[2] + falseFlags];
  }, [0, 0, 0]));
}

export function learningMetrics(result: Learning) {
  const [found, available, falseFlags] = sumEvidence([result]).reduce<Evidence>(
    (total, skill) => [total[0] + skill[0], total[1] + skill[1], total[2] + skill[2]], [0, 0, 0],
  );
  return `${result.right}/${result.decisions} right decisions · ${found}/${available} clues found · ${falseFlags} false flags`;
}
