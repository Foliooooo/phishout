import type { SkillStat } from "@/lib/impact";
import { cn } from "@/lib/utils";

/** Miss rate per skill, worst first. Skills with no clues yet are listed as “no data”. */
export function SkillBars({ skills, className }: { skills: SkillStat[]; className?: string }) {
  const sorted = skills.slice().sort((a, b) => (b.missRate ?? -1) - (a.missRate ?? -1));
  return (
    <ul className={cn("space-y-3", className)}>
      {sorted.map(skill => (
        <li key={skill.skill} className="grid grid-cols-[96px_1fr_88px] items-center gap-3 text-sm sm:grid-cols-[120px_1fr_120px]">
          <span className="font-bold">{skill.skill}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
            {skill.missRate !== null ? (
              <span className={cn("block h-full rounded-full", skill.missRate >= 0.5 ? "bg-danger" : skill.missRate >= 0.25 ? "bg-caution" : "bg-safe")} style={{ width: `${Math.max(3, skill.missRate * 100)}%` }} />
            ) : null}
          </span>
          <span className="text-right text-ink-soft tabular-nums">
            {skill.missRate === null ? "no data" : `${Math.round(skill.missRate * 100)}% missed`}
            <span className="sr-only"> ({skill.found} of {skill.available} caught)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
