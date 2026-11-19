"use client";

import "@xterm/xterm/css/xterm.css";
import type { Game } from "@/lib/games";
import type { PublicQuestion } from "@/lib/missions/terminal-cases";
import { cn } from "@/lib/utils";
import type { Terminal } from "@xterm/xterm";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Confetti, GameFrame, LoadingStage } from "./frame";
import { BulbOnIcon, CheckTickCircleIcon, CodeIcon, Icon, RefreshIcon, ServerIcon } from "./icon";
import { play } from "./sfx";

type Status = "connecting" | "live" | "ended" | "offline" | "error";
type Opened = { runId: string; questions: PublicQuestion[]; xp: number; complete: boolean };

/** Strict Mode mounts twice; share one open request so only one run starts. */
const opening = new Map<string, Promise<Response>>();

const THEME = {
  background: "#0b0b0e", foreground: "#e4e4e7", cursor: "#ff5fa2", cursorAccent: "#0b0b0e",
  selectionBackground: "#ff5fa244", black: "#18181b", red: "#ff6369", green: "#3dd68c", yellow: "#f5d90a",
  blue: "#70b8ff", magenta: "#ff5fa2", cyan: "#7ce2fe", white: "#e4e4e7", brightBlack: "#52525b",
};

/** A real shell on the VM, streamed into xterm.js, with the case questions alongside. */
export function TerminalMission({ game }: { game: Game }) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [problem, setProblem] = useState("");
  const [run, setRun] = useState<Opened | null>(null);
  const [attempt, setAttempt] = useState(0);
  const endpoint = `/api/terminal/${game.slug}`;

  const post = useCallback((body: object) => fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), [endpoint]);

  // Open the run and its shell.
  useEffect(() => {
    let live = true;
    // Opening (or retrying) is this effect’s job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("connecting");
    const key = `${game.slug}:${attempt}`;
    let request = opening.get(key);
    if (!request) {
      request = post({ type: "open" });
      opening.set(key, request);
      void request.finally(() => setTimeout(() => opening.delete(key), 2_000)).catch(() => {});
    }
    request.then(async shared => {
      const response = shared.clone();
      const body = await response.json().catch(() => null);
      if (!live) return;
      if (!response.ok) {
        setProblem(body?.error ?? "The terminal couldn’t start.");
        setStatus(body?.vm === false ? "offline" : "error");
        return;
      }
      setRun(body);
      setStatus(body.complete ? "ended" : "live");
    }).catch(() => { if (live) { setProblem("The terminal couldn’t start."); setStatus("offline"); } });
    return () => { live = false; };
  }, [post, attempt, game.slug]);

  const runId = run?.runId;

  // Wire up xterm, input, resize and the output long-poll once the shell is live.
  useEffect(() => {
    if (status !== "live" || !runId || !host.current) return;
    const element = host.current;
    let alive = true;
    let cleanup = () => {};
    // xterm.js needs the DOM, so it’s loaded only in the browser.
    void Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]).then(([{ Terminal }, { FitAddon }]) => {
    if (!alive) return;
    const terminal = new Terminal({ theme: THEME, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 14, cursorBlink: true, scrollback: 3000, allowProposedApi: false });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(element);
    fit.fit();
    terminal.focus();
    term.current = terminal;
    let cursor = 0;

    // Send keystrokes in small batches so fast typing doesn’t flood the server.
    let pending = "";
    let flushing = false;
    const flush = async () => {
      if (flushing || !pending) return;
      flushing = true;
      const data = pending;
      pending = "";
      const response = await post({ type: "input", runId, data }).catch(() => null);
      flushing = false;
      if (response?.status === 410) setStatus("ended");
      if (pending) void flush();
    };
    const typing = terminal.onData(data => { pending += data; void flush(); });

    const sendSize = () => {
      fit.fit();
      void post({ type: "resize", runId, cols: terminal.cols, rows: terminal.rows });
    };
    const observer = new ResizeObserver(() => sendSize());
    observer.observe(element);
    sendSize();

    const poll = async () => {
      while (alive) {
        const response = await fetch(`${endpoint}?runId=${runId}&since=${cursor}`, { cache: "no-store" }).catch(() => null);
        if (!alive) break;
        if (!response || !response.ok) {
          if (response?.status === 410 || response?.status === 404) { setStatus("ended"); break; }
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        const body = await response.json();
        if (body.data) {
          const bytes = Uint8Array.from(atob(body.data), char => char.charCodeAt(0));
          terminal.write(bytes);
        }
        cursor = body.next;
        if (!body.alive) { setStatus("ended"); break; }
      }
    };
    void poll();

    cleanup = () => {
      typing.dispose();
      observer.disconnect();
      terminal.dispose();
      term.current = null;
    };
    });
    return () => {
      alive = false;
      cleanup();
    };
  }, [status, runId, post, endpoint]);

  // Close the shell when leaving the page.
  useEffect(() => {
    if (!runId) return;
    const close = () => navigator.sendBeacon?.(endpoint, new Blob([JSON.stringify({ type: "close", runId })], { type: "application/json" }));
    window.addEventListener("pagehide", close);
    // Not closed on unmount: React mounts twice in development. Opening another
    // terminal closes this one, and idle shells close themselves after 5 minutes.
    return () => window.removeEventListener("pagehide", close);
  }, [runId, endpoint]);

  if (status === "connecting" && !run) return <LoadingStage title={`${game.title}: starting a terminal on the VM`} />;

  const solved = run?.questions.filter(question => question.correct).length ?? 0;
  const total = run?.questions.length ?? 4;

  return (
    <GameFrame game={game} accent="#3dd68c" step={run?.complete ? total : solved} total={total} xp={run?.xp ?? 0}>
      <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
        <div className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-[#0b0b0e] ring-1 ring-white/10">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 font-mono text-[12px] text-zinc-500">
            <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#ff5f57]" /><i className="size-2.5 rounded-full bg-[#febc2e]" /><i className="size-2.5 rounded-full bg-[#28c840]" /></span>
            <Icon icon={ServerIcon} size={13} className="ml-2" />
            analyst@forensics · /case/{game.slug}
            <span className={cn("ml-auto flex items-center gap-1.5", status === "live" ? "text-[#3dd68c]" : "text-zinc-500")}>
              <span className={cn("size-1.5 rounded-full", status === "live" ? "animate-pulse bg-[#3dd68c]" : "bg-zinc-600")} />
              {status === "live" ? "connected · internet disabled" : status === "ended" ? "session closed" : status === "connecting" ? "connecting" : "unavailable"}
            </span>
          </div>
          <div className="relative min-h-0 flex-1">
            <div ref={host} className="absolute inset-0 p-2" onClick={() => term.current?.focus()} />
            {(status === "offline" || status === "error" || status === "ended") && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b0e]/95 p-6 text-center">
                <div className="max-w-sm">
                  <Icon icon={status === "ended" ? CheckTickCircleIcon : ServerIcon} size={28} className={cn("mx-auto", status === "ended" ? "text-[#3dd68c]" : "text-zinc-500")} />
                  <p className="mt-3 text-[15px] font-semibold text-zinc-100">
                    {status === "ended" ? (run?.complete ? "Case closed." : "The terminal session ended.") : status === "offline" ? "This mission needs the PHISH//OUT VM." : "The terminal couldn’t start."}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
                    {status === "ended"
                      ? run?.complete ? "Your shell was destroyed with everything in it. Your score is saved." : "Shells close after 5 idle minutes or 20 minutes in total. Your answers so far are saved."
                      : status === "offline" ? "It runs a real Linux shell in a disposable, offline container, so there’s no in-tab version. Try again when the VM is up." : problem}
                  </p>
                  {!run?.complete && (
                    <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200">
                      <Icon icon={RefreshIcon} size={14} />{status === "ended" ? "Start a new shell" : "Try again"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {run && <CasePanel run={run} post={post} onUpdate={setRun} />}
      </div>
      {run?.complete && run.xp >= 75 && <Confetti accent="#3dd68c" />}
    </GameFrame>
  );
}

function CasePanel({ run, post, onUpdate }: { run: Opened; post: (body: object) => Promise<Response>; onUpdate: (run: Opened) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const submit = async (event: FormEvent, id: string) => {
    event.preventDefault();
    const value = values[id]?.trim();
    if (!value || busy) return;
    setBusy(id);
    const response = await post({ type: "answer", runId: run.runId, question: id, value }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setBusy(null);
    if (!response?.ok || !body) return;
    onUpdate({ runId: body.runId, questions: body.questions, xp: body.xp, complete: body.complete });
    if (body.correct) {
      play(body.complete ? "win" : "good");
      setWrong(null);
    } else {
      play("bad");
      setWrong(id);
    }
  };

  return (
    <aside className="flex max-h-[50%] min-h-0 flex-col overflow-hidden rounded-[10px] bg-[#18181b] text-zinc-100 ring-1 ring-white/10 lg:max-h-none lg:w-[380px] lg:shrink-0">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <Icon icon={CodeIcon} size={15} className="text-zinc-400" />
        <h2 className="text-[13px] font-semibold">Case file</h2>
        <span className="ml-auto text-[12px] text-zinc-500 tabular-nums">{run.questions.filter(item => item.correct).length}/{run.questions.length} solved</span>
      </header>
      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {run.questions.map((question, index) => (
          <li key={question.id} className={cn("rounded-lg p-3 ring-1", question.correct ? "bg-[#3dd68c]/[0.07] ring-[#3dd68c]/40" : "ring-white/[0.08]")}>
            <p className="flex gap-2 text-[13px] leading-relaxed">
              <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", question.correct ? "bg-[#3dd68c] text-[#0b0b0e]" : "bg-white/10 text-zinc-400")}>{question.correct ? "✓" : index + 1}</span>
              <span>{question.prompt}</span>
            </p>
            <AnimatePresence initial={false}>
              {question.correct ? (
                <motion.p key="done" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 pl-7 text-[12px] leading-relaxed text-zinc-400">{question.explanation}</motion.p>
              ) : (
                <motion.form key="form" onSubmit={event => void submit(event, question.id)} className="mt-2 flex gap-2 pl-7" animate={wrong === question.id ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.35 }}>
                  <input
                    value={values[question.id] ?? ""}
                    onChange={event => setValues(current => ({ ...current, [question.id]: event.target.value }))}
                    placeholder={question.placeholder}
                    aria-label={`Answer to question ${index + 1}`}
                    spellCheck={false}
                    autoCapitalize="off"
                    className={cn("h-9 min-w-0 flex-1 rounded-md bg-white/[0.06] px-3 font-mono text-[13px] outline-none placeholder:text-zinc-600 focus:ring-1", wrong === question.id ? "ring-1 ring-[#ff6369]" : "focus:ring-white/30")}
                  />
                  <button type="submit" disabled={busy === question.id} className="h-9 rounded-md bg-white px-3 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">Check</button>
                </motion.form>
              )}
            </AnimatePresence>
            {!question.correct && (
              <div className="mt-2 flex items-center gap-3 pl-7 text-[12px]">
                {question.tries > 0 && <span className="text-[#ff9592]">{question.tries} {question.tries === 1 ? "try" : "tries"}</span>}
                <button type="button" onClick={() => setHint(hint === question.id ? null : question.id)} className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200">
                  <Icon icon={BulbOnIcon} size={13} />{hint === question.id ? "Hide hint" : "Hint"}
                </button>
              </div>
            )}
            {hint === question.id && !question.correct && <p className="mt-2 rounded-md bg-white/[0.04] p-2 pl-7 font-mono text-[12px] leading-relaxed text-zinc-300">{question.hint}</p>}
          </li>
        ))}
      </ol>
      <footer className="border-t border-white/[0.06] p-4 text-[12px] text-zinc-500">
        {run.complete ? (
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[#3dd68c]">{run.xp} / 100 XP</span>
            <Link href="/scores" className="ml-auto text-zinc-300 underline underline-offset-2">My scores</Link>
          </div>
        ) : "25 XP for a first-try answer, 15 after a miss. Hints are free."}
      </footer>
    </aside>
  );
}
