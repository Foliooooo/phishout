"use client";

import type { PartyRow } from "@/lib/party";
import { cn } from "@/lib/utils";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type Board = { name: string; open: boolean; endsAt: string; members: number; rows: PartyRow[] };

/** The party leaderboard, refreshed every few seconds. `screen` is the projector layout. */
export function PartyBoard({ code, initial, screen = false }: { code: string; initial: Board; screen?: boolean }) {
  const [board, setBoard] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const still = useReducedMotion();

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const reply = await fetch(`/api/party/${code}`, { cache: "no-store" });
        if (reply.ok && live) setBoard(await reply.json());
      } catch {
        // Keep the last board on a blip; the next poll retries.
      }
      if (live) setNow(Date.now());
    };
    const timer = window.setInterval(load, 4000);
    return () => { live = false; window.clearInterval(timer); };
  }, [code]);

  const left = Math.max(0, new Date(board.endsAt).getTime() - now);
  const minutes = Math.floor(left / 60_000);
  const status = board.open && left > 0 ? `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ""}${minutes % 60}m left` : "Party over";
  const top = board.rows[0]?.score ?? 0;

  return (
    <section aria-label="Party leaderboard" className={cn("rounded-3xl", screen ? "bg-transparent" : "bg-paper-raised p-5 sm:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cn("font-bold tracking-tight", screen ? "text-5xl" : "text-2xl")}>Leaderboard</h2>
        <p className={cn("font-mono tabular-nums", screen ? "text-2xl text-paper/70" : "text-sm text-ink-soft")}>
          {board.members} {board.members === 1 ? "player" : "players"} · {status} · live
        </p>
      </div>
      {board.rows.length ? (
        <LayoutGroup>
          <ol className={cn("mt-4", screen ? "space-y-3" : "space-y-2")}>
            {board.rows.map(row => (
              <motion.li
                key={row.name}
                layout={!still}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden rounded-2xl",
                  screen ? "bg-paper/10 px-5 py-4" : "bg-paper px-4 py-3",
                  row.you && (screen ? "ring-2 ring-brand" : "ring-2 ring-brand"),
                )}
              >
                {/* Score bar behind the row. */}
                <span aria-hidden className={cn("absolute inset-y-0 left-0", screen ? "bg-brand/25" : "bg-brand-soft")} style={{ width: `${top ? (row.score / top) * 100 : 0}%` }} />
                <span className={cn("relative w-10 shrink-0 text-center font-mono font-bold tabular-nums", screen ? "text-4xl" : "text-xl", row.rank === 1 && "text-brand")}>{row.rank}</span>
                {row.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small user uploads served by the app
                  <img src={row.avatar} alt="" className={cn("relative shrink-0 rounded-full object-cover", screen ? "size-14" : "size-9")} />
                ) : (
                  <span aria-hidden className={cn("relative flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-paper", screen ? "size-14 text-xl" : "size-9 text-sm")}>{row.name.slice(0, 1).toUpperCase()}</span>
                )}
                <span className="relative min-w-0 flex-1">
                  <span className={cn("block truncate font-bold", screen ? "text-3xl" : "text-base")}>{row.name}{row.you ? " (you)" : ""}</span>
                  <span className={cn("block", screen ? "text-lg text-paper/70" : "text-xs text-ink-soft")}>{row.cleared} cleared · {row.runs} {row.runs === 1 ? "run" : "runs"} · {row.xp} XP</span>
                </span>
                <span className={cn("relative font-mono font-bold tabular-nums", screen ? "text-4xl" : "text-xl")}>{row.score.toLocaleString("en-IN")}</span>
              </motion.li>
            ))}
          </ol>
        </LayoutGroup>
      ) : (
        <p className={cn("mt-4", screen ? "text-2xl text-paper/70" : "text-ink-soft")}>No one has joined yet.</p>
      )}
    </section>
  );
}
