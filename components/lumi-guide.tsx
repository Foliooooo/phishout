"use client";

import { Lumi, type LumiMood } from "@/components/lumi";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type GuideLine = {
  text: string;
  /** Optional link for this tip. */
  href?: string;
  cta?: string;
  mood?: LumiMood;
  lure?: "light" | "mail";
};

/** Lumi with a speech bubble that types out tips one at a time. */
export function LumiGuide({
  lines,
  title = "Lumi says",
  tone = "raised",
  className,
}: {
  lines: GuideLine[];
  title?: string;
  tone?: "raised" | "soft" | "ink";
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const still = useReducedMotion();
  const line = lines[index % lines.length];
  const typing = !still && shown < line.text.length;

  useEffect(() => {
    if (still || shown >= line.text.length) return;
    const timer = window.setTimeout(() => setShown(count => Math.min(line.text.length, count + 2)), 18);
    return () => window.clearTimeout(timer);
  }, [shown, line.text, still]);

  function go(step: number) {
    setIndex(value => (value + step + lines.length) % lines.length);
    setShown(0);
  }

  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl p-5 sm:flex-row sm:items-end sm:gap-6 sm:p-6",
        tone === "raised" && "bg-paper-raised",
        tone === "soft" && "bg-brand-soft",
        tone === "ink" && "bg-ink text-paper",
        className,
      )}
    >
      <div className="w-40 shrink-0 sm:w-48">
        <Lumi mood={line.mood ?? "chill"} lure={line.lure ?? "light"} talking={typing} />
      </div>

      <div className="relative w-full min-w-0 flex-1">
        {/* Bubble tail pointing at Lumi. */}
        <span aria-hidden className={cn("absolute -top-2 left-1/2 size-5 -translate-x-1/2 rotate-45 sm:top-auto sm:bottom-8 sm:-left-2 sm:translate-x-0", tone === "ink" ? "bg-paper/10" : "bg-paper")} />
        <div className={cn("relative rounded-2xl p-5", tone === "ink" ? "bg-paper/10" : "bg-paper")}>
          <p className="font-mono text-xs font-bold tracking-wide text-brand uppercase">{title}</p>
          {/* The full line is in the DOM for screen readers; the typed copy is visual only. */}
          <p className="sr-only" aria-live="polite">{line.text}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              aria-hidden
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mt-2 min-h-[4.5rem] text-lg leading-snug font-semibold"
            >
              {still ? line.text : line.text.slice(0, shown)}
              {typing ? <span className="ml-0.5 inline-block h-5 w-2 translate-y-0.5 animate-pulse bg-brand" /> : null}
            </motion.p>
          </AnimatePresence>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {line.href ? (
              <Link href={line.href} className={buttonStyles({ variant: "primary" })} prefetch={false}>{line.cta ?? "Go"}</Link>
            ) : null}
            {lines.length > 1 ? (
              <>
                <button type="button" onClick={() => go(1)} className={buttonStyles({ variant: tone === "ink" ? "raised" : "secondary" })}>
                  {index === lines.length - 1 ? "Start over" : "Next tip"}
                </button>
                <span className={cn("ml-auto font-mono text-xs", tone === "ink" ? "text-paper/60" : "text-ink-soft")}>{index + 1}/{lines.length}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
