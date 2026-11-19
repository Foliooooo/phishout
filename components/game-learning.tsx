import { Icon } from "@/components/missions/icon";
import { learningFor } from "@/lib/games";
import { cn } from "@/lib/utils";
import { BulbOnIcon, CheckTickCircleIcon, GlobeIcon } from "@pikaicons/core-free";

/** “What you’ll learn” for a mission: skills, takeaways and where it applies. */
export function GameLearning({ slug, className, dark = false }: { slug: string; className?: string; dark?: boolean }) {
  const learning = learningFor(slug);
  if (!learning) return null;
  return (
    <section aria-labelledby={`learn-${slug}`} className={cn("rounded-3xl p-6 sm:p-8", dark ? "bg-ink text-paper" : "bg-paper-raised", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`learn-${slug}`} className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Icon icon={BulbOnIcon} size={26} className="text-brand" />What you’ll learn
        </h2>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Skills trained">
        {learning.skills.map(skill => (
          <li key={skill} className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-on-brand">{skill}</li>
        ))}
      </ul>
      <ul className="mt-5 space-y-3">
        {learning.takeaways.map(takeaway => (
          <li key={takeaway} className="flex gap-3">
            <Icon icon={CheckTickCircleIcon} size={20} className="mt-0.5 shrink-0 text-safe" />
            <span className={cn(dark ? "text-paper/90" : "text-ink")}>{takeaway}</span>
          </li>
        ))}
      </ul>
      <p className={cn("mt-5 flex gap-3 rounded-2xl p-4 text-sm", dark ? "bg-paper/10 text-paper/80" : "bg-paper-deep text-ink-soft")}>
        <Icon icon={GlobeIcon} size={18} className="mt-0.5 shrink-0" />
        <span><b className={cn(dark ? "text-paper" : "text-ink")}>In real life:</b> {learning.realWorld}</span>
      </p>
    </section>
  );
}
