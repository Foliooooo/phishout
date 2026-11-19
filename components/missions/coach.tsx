"use client";

import { getGame } from "@/lib/games";
import type { MissionReport } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, Icon, MultipleCrossCancelIcon, SendPlaneHorizontalIcon, BulbOnIcon } from "./icon";
import { play } from "./sfx";

type Ask = (question?: string) => Promise<{ hint?: string; remaining?: number; error?: string }>;

/**
 * The in-game AI coach (Gemini). Up to two nudges per situation; it never
 * names the suspicious detail or the right action. Hints don’t change XP.
 */
export function CoachPanel({ step, ask, onClose }: { step: number; ask: Ask; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [hints, setHints] = useState<{ step: number; text: string }[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const here = hints.filter(hint => hint.step === step);
  const exhausted = here.length >= 2;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pending || exhausted) return;
    setPending(true);
    setError("");
    const result = await ask(question.trim() || undefined);
    setPending(false);
    if (result.hint) {
      play("pop");
      setHints(list => [...list, { step, text: result.hint! }]);
      setQuestion("");
    } else setError(result.error ?? "The coach is unavailable.");
  };

  return (
    <motion.section
      aria-label="AI coach"
      className="absolute bottom-3 left-3 z-40 flex w-[min(360px,calc(100%-1.5rem))] flex-col rounded-xl bg-[#18181b] text-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
    >
      <header className="flex h-11 items-center gap-2 border-b border-white/[0.06] px-4">
        <Icon icon={BulbOnIcon} size={15} className="text-[#f5d90a]" />
        <h2 className="text-[13px] font-semibold">Coach</h2>
        <span className="text-[12px] text-zinc-500">{2 - here.length} of 2 hints left</span>
        <button type="button" onClick={onClose} aria-label="Close coach" className="ml-auto flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.08] hover:text-white">
          <Icon icon={MultipleCrossCancelIcon} size={14} />
        </button>
      </header>
      <div className="max-h-56 space-y-2 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed" aria-live="polite">
        {here.length === 0 && !pending && <p className="text-zinc-400">Stuck? Ask what to look at. The coach won’t give you the answer, and hints don’t cost XP.</p>}
        {here.map(hint => <p key={hint.text} className="rounded-lg bg-white/[0.05] px-3 py-2 text-zinc-200">{hint.text}</p>)}
        {pending && <p className="text-zinc-500">Thinking…</p>}
        {error && <p className="text-[#ff9592]">{error}</p>}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/[0.06] p-2">
        <input
          value={question}
          onChange={event => setQuestion(event.target.value)}
          maxLength={200}
          disabled={pending || exhausted}
          placeholder={exhausted ? "No hints left for this situation" : "Ask about this situation (optional)"}
          aria-label="Question for the coach"
          className="h-9 min-w-0 flex-1 rounded-md bg-white/[0.06] px-3 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-white/25 disabled:opacity-50"
        />
        <button type="submit" disabled={pending || exhausted} aria-label="Get a hint" className="flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-40">
          <Icon icon={SendPlaneHorizontalIcon} size={14} />Hint
        </button>
      </form>
    </motion.section>
  );
}

/** Gemini’s written report on a finished run, with skill ratings anchored to the measured results. */
export function CoachReport({ load }: { load: () => Promise<MissionReport | { error: string } | null> }) {
  const [report, setReport] = useState<MissionReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    load().then(result => {
      if (!live) return;
      if (result && "headline" in result) setReport(result);
      else setError(result?.error ?? "The coach report is unavailable.");
    });
    return () => { live = false; };
  }, [load]);

  if (error) return <p className="mt-8 flex items-center gap-2 text-[13px] text-zinc-500"><Icon icon={BulbOnIcon} size={14} />{error}</p>;

  const next = report && getGame(report.next);
  return (
    <section aria-labelledby="coach-report" className="mt-8">
      <h3 id="coach-report" className="flex items-center gap-2 text-[13px] font-medium text-zinc-400">
        <Icon icon={BulbOnIcon} size={14} className="text-[#f5d90a]" />Coach report
      </h3>
      <AnimatePresence mode="wait">
        {!report ? (
          <motion.div key="loading" className="mt-2 space-y-2 rounded-lg p-4 ring-1 ring-white/[0.08]" exit={{ opacity: 0 }}>
            {[70, 90, 55].map(width => <div key={width} className="h-3 animate-pulse rounded bg-white/[0.07]" style={{ width: `${width}%` }} />)}
            <p className="pt-1 text-[12px] text-zinc-500">Writing your report…</p>
          </motion.div>
        ) : (
          <motion.div key="report" className="mt-2 rounded-lg ring-1 ring-white/[0.08]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="border-b border-white/[0.06] p-4 text-[15px] font-medium">{report.headline}</p>
            {report.skills.length > 0 && (
              <ul className="divide-y divide-white/[0.06] border-b border-white/[0.06]">
                {report.skills.map(skill => (
                  <li key={skill.skill} className="grid grid-cols-[110px_auto_1fr] items-baseline gap-3 px-4 py-2.5 text-[13px]">
                    <span className="text-zinc-300">{skill.skill}</span>
                    <span className="flex gap-1" aria-label={`${skill.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map(dot => <i key={dot} className={cn("size-2 rounded-full", dot <= skill.rating ? "bg-[#f5d90a]" : "bg-white/15")} />)}
                    </span>
                    <span className="text-zinc-500">{skill.note}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-4 p-4 text-[13px] sm:grid-cols-2">
              <div>
                <p className="text-[12px] font-medium text-[#3dd68c]">Strengths</p>
                <ul className="mt-1 space-y-1 text-zinc-300">{report.strengths.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[#f5d90a]">Work on</p>
                <ul className="mt-1 space-y-1 text-zinc-300">{report.focus.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
            {next && (
              <Link href={`/games/${next.slug}`} className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3 text-[13px] text-zinc-300 hover:bg-white/[0.04]">
                Suggested next: <span className="font-medium text-white">{next.title}</span><Icon icon={ArrowRightIcon} size={14} className="ml-auto" />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-2 text-[11px] text-zinc-600">Written by Gemini from your results. Ratings stay within one step of what you actually caught.</p>
    </section>
  );
}
