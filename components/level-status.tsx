import { auth } from "@/auth";
import { Icon } from "@/components/missions/icon";
import { levelOf } from "@/lib/levels";
import { getProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { LockCloseIcon, LockOpenIcon } from "@pikaicons/core-free";
import { connection } from "next/server";
import { Suspense } from "react";

async function Status({ slug, className }: { slug?: string; className?: string }) {
  await connection();
  const session = await auth();
  if (slug && slug !== "endless" && levelOf(slug) === "novice") return null;
  let open = false;
  let text = "Locked until you clear every Novice mission (50+ XP each).";
  if (session?.user.id) {
    const progress = await getProgress(session.user.id, session.user.email).catch(() => null);
    if (progress?.expertUnlocked) {
      open = true;
      text = progress.admin && progress.level === "novice" ? "Unlocked for you (admin)." : "Unlocked. You cleared Novice.";
    } else if (progress) {
      const left = progress.novice.left.length;
      text = `Locked: clear ${left} more Novice ${left === 1 ? "mission" : "missions"} to unlock.`;
    }
  }
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold", open ? "bg-safe/15" : "bg-paper-deep text-ink", className)}>
      <Icon icon={open ? LockOpenIcon : LockCloseIcon} size={16} />{text}
    </p>
  );
}

/** Whether the Expert level is open for the current player. */
export function LevelStatus(props: { slug?: string; className?: string }) {
  return <Suspense fallback={null}><Status {...props} /></Suspense>;
}
