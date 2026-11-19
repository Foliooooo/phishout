import { LumiGuide, type GuideLine } from "@/components/lumi-guide";
import { Icon } from "@/components/missions/icon";
import { buttonStyles } from "@/components/ui/button";
import { getGame, type Game } from "@/lib/games";
import { BADGES, BADGE_KINDS, EXPERT_MISSIONS, LEVELS, NOVICE_MISSIONS, PASS_XP, type Badge, type BadgeKind } from "@/lib/levels";
import type { Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { CheckTickCircleIcon, LockCloseIcon } from "@pikaicons/core-free";
import Link from "next/link";

const shortDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

const kindTone: Record<BadgeKind, { fill: string; ring: string }> = {
  milestone: { fill: "#ff5fa2", ring: "#e63d85" },
  achievement: { fill: "#2b1d24", ring: "#ff5fa2" },
  streak: { fill: "#f59e0b", ring: "#c2410c" },
};

/** A badge medal: a scalloped seal with a short mark. Greyed out until earned. */
export function BadgeMedal({ badge, earned, size = 72 }: { badge: Badge; earned: boolean; size?: number }) {
  const tone = kindTone[badge.kind];
  const points = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const radius = index % 2 ? 44 : 48;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={cn("shrink-0", !earned && "opacity-35 grayscale")}>
      <polygon points={points} fill={tone.ring} />
      <circle cx="50" cy="50" r="36" fill={tone.fill} stroke="#fff" strokeWidth="3" strokeDasharray="4 4" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#fff" fontFamily="ui-monospace, monospace" fontWeight="800" fontSize={badge.mark.length > 2 ? 20 : 26}>
        {badge.mark}
      </text>
    </svg>
  );
}

/** Every badge, grouped by kind, with the earned ones in colour. */
export function BadgeGrid({ progress, className }: { progress: Progress; className?: string }) {
  const earned = new Map(progress.badges.map(badge => [badge.id, badge.earnedAt]));
  return (
    <section aria-labelledby="badges" className={cn("rounded-3xl bg-paper-raised p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges" className="text-xl font-bold">Badges</h2>
        <span className="font-mono text-sm text-ink-soft">{progress.badges.length}/{BADGES.length} earned</span>
      </div>
      {(Object.keys(BADGE_KINDS) as BadgeKind[]).map(kind => (
        <div key={kind} className="mt-5">
          <h3 className="text-sm font-bold text-ink-soft">{BADGE_KINDS[kind]}</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {BADGES.filter(badge => badge.kind === kind).map(badge => {
              const at = earned.get(badge.id);
              return (
                <li key={badge.id} className={cn("flex items-center gap-3 rounded-2xl p-3", at ? "bg-brand-soft" : "bg-paper-deep")}>
                  <BadgeMedal badge={badge} earned={Boolean(at)} size={52} />
                  <div className="min-w-0">
                    <p className="font-bold">{badge.title}</p>
                    <p className="text-sm text-ink-soft">{badge.description}</p>
                    <p className="mt-0.5 text-xs font-semibold text-ink-soft">{at ? `Earned ${shortDate.format(at)}` : "Not yet"}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Track({ level, slugs, cleared, best, locked }: { level: "novice" | "expert"; slugs: readonly string[]; cleared: Set<string>; best: Record<string, number>; locked: boolean }) {
  const done = slugs.filter(slug => cleared.has(slug)).length;
  return (
    <div className={cn("rounded-2xl p-4", level === "novice" ? "bg-brand-soft" : "bg-ink text-paper")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          {locked ? <Icon icon={LockCloseIcon} size={18} /> : null}{LEVELS[level].title}
        </h3>
        <span className="font-mono text-sm tabular-nums">{done}/{slugs.length}</span>
      </div>
      <div className={cn("mt-2 h-2 overflow-hidden rounded-full", level === "novice" ? "bg-paper" : "bg-paper/15")}>
        <div className="h-full rounded-full bg-brand" style={{ width: `${(done / slugs.length) * 100}%` }} />
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {slugs.map(slug => {
          const game = getGame(slug);
          const ok = cleared.has(slug);
          return (
            <li key={slug}>
              <Link href={`/games/${slug}`} className="flex items-center gap-2 hover:underline">
                <Icon icon={ok ? CheckTickCircleIcon : locked ? LockCloseIcon : CheckTickCircleIcon} size={16} className={cn("shrink-0", ok ? "text-safe" : "opacity-40")} />
                <span className="flex-1">{game?.title ?? slug}</span>
                <span className="font-mono text-xs opacity-70">{best[slug] !== undefined ? `${best[slug]} XP` : "–"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Novice → Expert → Certificate, with what’s cleared and what’s left. */
export function LevelCard({ progress, className }: { progress: Progress; className?: string }) {
  const cleared = new Set(progress.cleared);
  return (
    <section aria-labelledby="level" className={cn("rounded-3xl bg-paper-raised p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">Your level</p>
          <h2 id="level" className="text-3xl font-bold tracking-tight">
            {progress.certified ? "Certified Expert" : LEVELS[progress.level].title}
            {progress.admin ? <span className="ml-2 rounded-full bg-ink px-2.5 py-1 align-middle text-xs font-bold text-paper">Admin · everything done</span> : null}
          </h2>
        </div>
        <Link href="/certificate" className={buttonStyles({ variant: progress.certified ? "primary" : "secondary", size: "sm" })}>
          {progress.certified ? "View certificate" : "Certificate"}
        </Link>
      </div>
      <p className="mt-2 text-sm text-ink-soft">A mission counts once you score {PASS_XP}+ XP in it. Clear all Novice missions to unlock Expert, then clear Expert for your certificate.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Track level="novice" slugs={NOVICE_MISSIONS} cleared={cleared} best={progress.best} locked={false} />
        <Track level="expert" slugs={EXPERT_MISSIONS} cleared={cleared} best={progress.best} locked={!progress.expertUnlocked} />
      </div>
    </section>
  );
}

export function StreakCard({ progress, className }: { progress: Progress; className?: string }) {
  return (
    <section aria-label="Streak" className={cn("grid grid-cols-2 overflow-hidden rounded-3xl bg-paper-raised", className)}>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-ink-soft">Current streak</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{progress.streak.current} {progress.streak.current === 1 ? "day" : "days"}</p>
        <p className="mt-1 text-xs text-ink-soft">{progress.streak.playedToday ? "You’ve played today." : progress.streak.current ? "Finish a mission today to keep it going." : "Finish a mission to start one."}</p>
      </div>
      <div className="border-l border-paper-deep p-5 sm:p-6">
        <p className="text-sm text-ink-soft">Longest streak</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{progress.streak.longest} {progress.streak.longest === 1 ? "day" : "days"}</p>
      </div>
    </section>
  );
}

/** Shown instead of an Expert mission until Novice is cleared. */
export function LockedMission({ game, progress }: { game: Game; progress: Progress }) {
  const left = progress.novice.left.map(slug => getGame(slug)).filter(Boolean) as Game[];
  const lines: GuideLine[] = [
    { text: `${game.title} is an Expert mission. Clear every Novice mission first (${PASS_XP}+ XP each). You’ve cleared ${progress.novice.done} of ${progress.novice.total}.`, mood: "suspicious" },
    ...left.slice(0, 3).map(item => ({ text: `${item.title} is still waiting. ${item.blurb}`, href: `/games/${item.slug}/play`, cta: `Play ${item.title}` })),
  ];
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-3 py-8 sm:px-4">
      <header className="rounded-3xl bg-ink p-6 text-paper sm:p-10">
        <p className="flex items-center gap-2 text-sm font-bold text-brand"><Icon icon={LockCloseIcon} size={16} />Expert level · locked</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{game.title}</h1>
        <p className="mt-3 max-w-xl text-paper/80">{LEVELS.expert.blurb}</p>
      </header>
      <LumiGuide lines={lines} title="Lumi, your guide" />
      <LevelCard progress={progress} />
    </main>
  );
}
