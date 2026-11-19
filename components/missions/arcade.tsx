"use client";

import type { ArcadeView } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CountUp } from "./frame";
import { ClockIcon, FireSolidIcon, HeartIcon, HeartSolidIcon, Icon, TrophyIcon } from "./icon";
import { play } from "./sfx";

/**
 * Seconds on the current situation’s clock. The server starts the clock and
 * reports how long it has been running; this keeps it ticking in between.
 * Null while the clock is stopped (briefing, feedback, boss intro).
 */
function useClock(elapsed: number | null, step: number) {
  const [tick, setTick] = useState<{ step: number; seconds: number } | null>(null);

  useEffect(() => {
    if (elapsed === null) return;
    // Resynced to the server’s reading on every update, then counted locally.
    const started = performance.now();
    const timer = window.setInterval(() => setTick({ step, seconds: elapsed + (performance.now() - started) / 1000 }), 250);
    return () => window.clearInterval(timer);
  }, [elapsed, step]);

  if (elapsed === null) return null;
  return tick && tick.step === step && tick.seconds >= elapsed ? tick.seconds : elapsed;
}

/** Lives, combo, arcade score and the situation clock, under the game toolbar. */
export function ArcadeBar({ arcade, step, accent }: { arcade: ArcadeView; step: number; accent: string }) {
  const seconds = useClock(arcade.elapsed, step);
  const left = seconds === null ? arcade.limit : Math.max(0, arcade.limit - seconds);
  const fraction = arcade.limit ? left / arcade.limit : 0;
  const overtime = seconds !== null && left === 0;
  const urgent = seconds !== null && left > 0 && left <= 8;
  const whole = Math.ceil(left);
  const lastTick = useRef<number | null>(null);
  const still = useReducedMotion();

  // A quiet tick for the last few seconds, and an alarm when the bonus runs out.
  useEffect(() => {
    if (seconds === null || lastTick.current === whole) return;
    lastTick.current = whole;
    if (whole === 0) play("alarm");
    else if (whole <= 5) play("tick");
  }, [whole, seconds]);

  const bar = arcade.boss ? "#e5484d" : accent;

  return (
    <div className={cn("mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-3 py-2 ring-1", arcade.boss ? "bg-[#e5484d]/10 ring-[#e5484d]/40" : "bg-white/[0.03] ring-white/[0.06]")}>
      <div className="flex items-center gap-1" aria-label={`${arcade.lives} of ${arcade.livesMax} lives left`}>
        {Array.from({ length: arcade.livesMax }, (_, index) => {
          const alive = index < arcade.lives;
          return (
            <motion.span
              key={index}
              initial={false}
              animate={alive ? { scale: 1, opacity: 1 } : { scale: still ? 1 : [1.4, 0.9], opacity: 0.35 }}
              transition={{ duration: 0.35 }}
              className={cn(alive ? "text-[#ff5fa2]" : "text-zinc-600")}
            >
              <Icon icon={alive ? HeartSolidIcon : HeartIcon} size={18} />
            </motion.span>
          );
        })}
      </div>

      <AnimatePresence mode="popLayout">
        {arcade.combo > 1 ? (
          <motion.span
            key={arcade.combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex items-center gap-1 rounded-full bg-[#f5a524]/15 px-2 py-0.5 text-[12px] font-bold text-[#f5a524] tabular-nums"
          >
            <Icon icon={FireSolidIcon} size={14} />{Math.min(arcade.combo, 3)}× combo
          </motion.span>
        ) : null}
      </AnimatePresence>

      {arcade.boss ? (
        <span className="rounded-full bg-[#e5484d] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">Boss · 2× points</span>
      ) : null}

      <div className="ml-auto flex min-w-[180px] flex-1 items-center gap-2 sm:max-w-[320px]">
        <Icon icon={ClockIcon} size={15} className={cn(urgent || overtime ? "text-[#ff6369]" : "text-zinc-500")} />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]" role="timer" aria-label={overtime ? "Time bonus used up" : `${whole} seconds of time bonus left`}>
          <div className={cn("h-full rounded-full transition-[width] duration-300 ease-linear", urgent && !still && "animate-pulse")} style={{ width: `${fraction * 100}%`, background: urgent || overtime ? "#ff6369" : bar }} />
        </div>
        <span className={cn("w-16 text-right font-mono text-[12px] tabular-nums", overtime ? "text-[#ff6369]" : "text-zinc-400")}>
          {seconds === null ? `${arcade.limit}s` : overtime ? "overtime" : `${whole}s`}
        </span>
      </div>

      <span className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums">
        <Icon icon={TrophyIcon} size={15} className="text-[#f5a524]" />
        <CountUp value={arcade.score} />
      </span>
    </div>
  );
}

/** Shown before the last situation. */
export function BossIntro({ onGo }: { onGo: () => void }) {
  const still = useReducedMotion();
  return (
    <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="boss-title"
        className="w-full max-w-[440px] rounded-xl bg-[#18181b] p-6 text-center text-zinc-100 ring-1 ring-[#e5484d]/50"
        initial={still ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <p className="text-[12px] font-bold tracking-[0.3em] text-[#ff6369] uppercase">Final situation</p>
        <h2 id="boss-title" className="mt-2 text-[32px] font-bold tracking-tight">Boss round</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">The sneakiest one is saved for last. You get 30 seconds of time bonus instead of 45, and every point counts double.</p>
        <button type="button" autoFocus onClick={onGo} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#e5484d] text-[14px] font-semibold text-white hover:bg-[#ff6369]">
          Bring it on
        </button>
      </motion.section>
    </motion.div>
  );
}

/** The arcade points one situation earned, for the feedback card. */
export function ArcadeLineView({ line, lives, livesMax, correct }: { line: ArcadeView["lines"][number]; lives: number; livesMax: number; correct: boolean }) {
  if (!correct) {
    return (
      <p className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-[#e5484d]/10 px-3 py-2 text-[13px] text-[#ff6369] ring-1 ring-[#e5484d]/30">
        <Icon icon={HeartIcon} size={15} />
        {lives > 0 ? `You lost a life. ${lives} of ${livesMax} left, and your combo resets.` : "Out of lives. You got hooked."}
      </p>
    );
  }
  const parts = [`${line.base} base`, line.combo > 1 ? `${line.combo}× combo` : null, line.time ? `+${line.time} time` : null, line.boss ? "2× boss" : null].filter(Boolean);
  return (
    <motion.p
      className="mx-6 mt-3 flex flex-wrap items-center gap-x-2 rounded-lg bg-[#f5a524]/10 px-3 py-2 text-[13px] text-[#f5a524] ring-1 ring-[#f5a524]/30"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15 }}
    >
      <Icon icon={TrophyIcon} size={15} />
      <b className="text-[15px] tabular-nums">+<CountUp value={line.total} /></b> arcade
      <span className="text-[12px] text-[#f5a524]/75">{parts.join(" · ")}</span>
    </motion.p>
  );
}
