"use client";

import { Icon } from "@/components/missions/icon";
import { games, getGame } from "@/lib/games";
import { BADGES, NOVICE_MISSIONS, PASS_XP } from "@/lib/levels";
import type { SandboxStatus } from "@/lib/sandbox-service";
import { cn } from "@/lib/utils";
import {
  BotIcon, BulbOnIcon, CodeIcon, DatabaseIcon, GraphTrendLineIcon, LaptopIcon, LockCloseIcon, PauseCircleIcon,
  PlayCircleIcon, RefreshIcon, ServerIcon, ShieldCheckIcon, TvIcon,
} from "@pikaicons/core-free";
import { Range } from "@/components/ui/range";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Shared surface styles                                               */
/* ------------------------------------------------------------------ */

const panel = "rounded-2xl bg-lab-fg/[0.03] ring-1 ring-lab-fg/[0.08]";
const chip = "rounded-md bg-lab-fg/[0.06] px-2 py-0.5 font-mono text-[11px] text-lab-soft";

/* ------------------------------------------------------------------ */
/* 1. Trace a request through the system                               */
/* ------------------------------------------------------------------ */

type Part = "browser" | "server" | "engine" | "gemini" | "model" | "mongo" | "vm";
type IconData = typeof ServerIcon;

const PARTS: Record<Part, { lane: number; title: string; tech: string[]; icon: IconData }> = {
  browser: { lane: 0, title: "Player’s browser", tech: ["React 19", "Motion"], icon: LaptopIcon },
  server: { lane: 1, title: "App server", tech: ["Next.js 16", "Auth.js"], icon: ServerIcon },
  engine: { lane: 1, title: "Mission engine", tech: ["scoring v2", "levels", "badges"], icon: CodeIcon },
  gemini: { lane: 2, title: "Gemini", tech: ["JSON schema", "guardrails"], icon: BotIcon },
  model: { lane: 2, title: "Prediction model", tech: ["7 sigmoid units", "swappable"], icon: GraphTrendLineIcon },
  mongo: { lane: 3, title: "MongoDB", tech: ["runs", "attempts", "certificates"], icon: DatabaseIcon },
  vm: { lane: 3, title: "VM sandbox", tech: ["Rust · Axum", "Chromium", "bash shells"], icon: TvIcon },
};

const LANES = ["Client", "Server", "Intelligence", "Data & compute"];

const TRACES: { id: string; label: string; steps: { part: Part; text: string }[] }[] = [
  { id: "flag", label: "Flag a clue", steps: [
    { part: "browser", text: "You tick a detail on the evidence board. Only the clue index and the situation number are sent." },
    { part: "server", text: "The server checks your session and loads your run." },
    { part: "engine", text: "The engine ignores stale or duplicate events by checking the situation number." },
    { part: "mongo", text: "The new state is written with an optimistic revision, so two clicks can’t both count." },
    { part: "browser", text: "The updated board comes back. Whether the clue is suspicious stays secret until you decide." },
  ] },
  { id: "coach", label: "Ask the coach", steps: [
    { part: "browser", text: "You ask for a hint, optionally with a question." },
    { part: "server", text: "Two hints per situation. The server loads the full situation, including what you can’t see yet." },
    { part: "gemini", text: "Gemini is told never to name the suspicious detail or the right action, and to treat your question as untrusted." },
    { part: "server", text: "The hint is checked: no links, short, and it can’t repeat an action label. Otherwise it’s dropped." },
    { part: "mongo", text: "Hint use is recorded for the educator view. It never changes your XP." },
  ] },
  { id: "finish", label: "Finish a mission", steps: [
    { part: "engine", text: "Decision XP (up to 75) and evidence XP (up to 25) are scored, with false flags penalised." },
    { part: "mongo", text: "The result and per-skill learning data feed My scores, the leaderboard and training data." },
    { part: "model", text: "Your history becomes seven features per skill; the model returns your chance of missing each kind of sign." },
    { part: "gemini", text: "Gemini writes your coach report. Ratings can’t move more than one step from what you caught." },
    { part: "browser", text: "Results, the report and your next suggested mission appear." },
  ] },
  { id: "unlock", label: "Unlock Expert", steps: [
    { part: "browser", text: "You open an Expert mission, like Header Hunt." },
    { part: "server", text: "The play page and every mission API check your level on the server, so the lock can’t be skipped from the browser." },
    { part: "mongo", text: "Your completed runs are read back, oldest first." },
    { part: "engine", text: `Level, badges and streaks are worked out from those runs: ${NOVICE_MISSIONS.length} Novice missions at ${PASS_XP}+ XP each unlock Expert.` },
    { part: "browser", text: "Still locked? Lumi shows the Novice missions you have left. Unlocked? The mission starts." },
  ] },
  { id: "certificate", label: "Earn the certificate", steps: [
    { part: "engine", text: `Your last Expert mission clears: all ${games.length} missions now have ${PASS_XP}+ XP.` },
    { part: "server", text: "Opening the certificate page issues one certificate per player, never more." },
    { part: "mongo", text: "It’s stored with a random 12-character ID, your profile name and your XP." },
    { part: "browser", text: "You print it or save it as a PDF. The page prints as one landscape A4 sheet." },
    { part: "server", text: "Anyone with the ID can open the public verify page to check it’s real." },
  ] },
  { id: "sandbox", label: "Launch a sandbox", steps: [
    { part: "browser", text: "You open a real-browser mission." },
    { part: "server", text: "The server records the attempt and asks the VM controller for a slot, bound to your session." },
    { part: "vm", text: "The Rust controller allows four at once and one per player, then starts an offline Chromium container." },
    { part: "browser", text: "H.264 video streams in; your mouse and keyboard go back over a private socket." },
    { part: "mongo", text: "When you close it, the score is read from the isolated fixture and saved; the container is destroyed." },
  ] },
];

export function RequestTrace() {
  const [trace, setTrace] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const still = useReducedMotion();
  const steps = TRACES[trace].steps;
  const active = steps[step].part;
  const visited = new Set(steps.slice(0, step + 1).map(item => item.part));

  useEffect(() => {
    if (!playing || still) return;
    const timer = setInterval(() => setStep(value => (value + 1) % steps.length), 2200);
    return () => clearInterval(timer);
  }, [playing, steps.length, still]);

  const choose = (index: number) => {
    setTrace(index);
    setStep(0);
    setPlaying(true);
  };

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className={cn(panel, "p-3 sm:p-4")}>
        {LANES.map((lane, laneIndex) => (
          <div key={lane} className={cn("grid items-stretch gap-2 py-3 sm:grid-cols-[92px_minmax(0,1fr)]", laneIndex > 0 && "border-t border-dashed border-lab-fg/[0.08]")}>
            <p className="pt-3 text-[11px] font-medium tracking-wide text-lab-faint uppercase">{lane}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(PARTS) as Part[]).filter(part => PARTS[part].lane === laneIndex).map(part => {
                const item = PARTS[part];
                const on = part === active;
                const seen = visited.has(part);
                return (
                  <motion.div
                    key={part}
                    animate={{ scale: on ? 1.02 : 1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl p-3 ring-1 transition-colors",
                      on ? "bg-[#ff5fa2]/15 ring-[#ff5fa2]" : seen ? "bg-lab-fg/[0.04] ring-lab-fg/15" : "bg-transparent ring-lab-fg/[0.06]",
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", on ? "bg-[#ff5fa2] text-[#2b1d24]" : "bg-lab-fg/[0.06] text-lab-text")}>
                      <Icon icon={item.icon} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-lab-strong">{item.title}</span>
                      <span className="mt-1 flex flex-wrap gap-1">{item.tech.map(tech => <span key={tech} className={chip}>{tech}</span>)}</span>
                    </span>
                    {on && !still && <span aria-hidden className="absolute -top-1 -right-1 size-3 animate-ping rounded-full bg-[#ff5fa2]" />}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={cn(panel, "flex flex-col p-4")}>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Request to trace">
          {TRACES.map((item, index) => (
            <button key={item.id} type="button" role="tab" aria-selected={index === trace} onClick={() => choose(index)} className={cn("h-8 rounded-lg px-3 text-[12px] font-medium transition-colors", index === trace ? "bg-lab-strong text-lab" : "bg-lab-fg/[0.05] text-lab-text hover:bg-lab-fg/10")}>
              {item.label}
            </button>
          ))}
        </div>
        <ol className="mt-4 flex-1 space-y-1">
          {steps.map((item, index) => (
            <li key={index}>
              <button type="button" onClick={() => { setStep(index); setPlaying(false); }} className={cn("flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors", index === step ? "bg-lab-fg/[0.06]" : "hover:bg-lab-fg/[0.03]")}>
                <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums", index < step ? "bg-[#3dd68c] text-lab" : index === step ? "bg-[#ff5fa2] text-[#2b1d24]" : "bg-lab-fg/10 text-lab-faint")}>{index + 1}</span>
                <span className={cn("text-[13px] leading-relaxed", index === step ? "text-lab-strong" : "text-lab-faint")}>
                  <b className="font-semibold">{PARTS[item.part].title}.</b> {item.text}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setPlaying(value => !value)} className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-lab-fg/[0.06] text-[13px] font-medium text-lab-text hover:bg-lab-fg/10">
          <Icon icon={playing ? PauseCircleIcon : PlayCircleIcon} size={16} />{playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The live sandbox fleet                                           */
/* ------------------------------------------------------------------ */

const ISOLATION = [
  ["Container per player", "Docker, capped CPU and memory, removed on exit."],
  ["No network", "Missions run on fictional .example sites served inside the box."],
  ["Disposable profile", "A fresh Chromium profile every time: no cookies, no history."],
  ["Private input socket", "Your keys and clicks travel over a Unix socket, not the internet."],
  ["Timeouts", "Idle sandboxes close after 90 seconds; any sandbox closes after 12 minutes."],
  ["Owner-bound", "Each stream only answers the signed-in session that started it."],
  ["Real terminals", "Forensics missions get a bash shell with no network, a read-only case folder and capped memory, CPU and processes."],
];

const LIFECYCLE = [
  ["Ask", "The app asks the Rust controller for a slot tied to your session."],
  ["Boot", "A fresh, offline Chromium container starts in a few seconds."],
  ["Stream", "Video streams to you; your clicks and keys go back privately."],
  ["Score", "Your result is read from the mission’s own files when you finish."],
  ["Destroy", "The container and its profile are deleted. Nothing carries over."],
];

function useSandboxStatus() {
  const [status, setStatus] = useState<SandboxStatus | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/sandbox/status", { cache: "no-store" })
      .then(response => response.json())
      .then(data => { if (live) setStatus(data); })
      .catch(() => { if (live) setStatus(current => current ?? { online: false, max: 4, active: 0, idleLimitSeconds: 90, lifetimeSeconds: 720, sessions: [] }); });
    void load();
    const timer = setInterval(load, 5_000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return status;
}

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function SandboxFleet() {
  const status = useSandboxStatus();
  const max = status?.max ?? 6;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className={cn(panel, "flex flex-col p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium", status?.online ? "bg-[#3dd68c]/15 text-safe" : "bg-lab-fg/[0.06] text-lab-soft")}>
            <span className={cn("size-2 rounded-full", status?.online ? "animate-pulse bg-[#3dd68c]" : "bg-lab-faint")} />
            {status === null ? "Checking the VM…" : status.online ? "VM online" : "VM offline"}
          </span>
          <span className="text-[13px] text-lab-soft tabular-nums">{status?.active ?? 0} of {max} sandboxes in use</span>
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-lab-faint"><Icon icon={RefreshIcon} size={13} />live, every 5 s</span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: max }, (_, index) => {
            const session = status?.sessions[index];
            const game = session && getGame(session.slug);
            return (
              <li key={index} className={cn("relative overflow-hidden rounded-xl p-3 ring-1", session ? "bg-[#ff5fa2]/10 ring-[#ff5fa2]/50" : "bg-lab-fg/[0.02] ring-lab-fg/[0.06]")}>
                <p className="flex items-center justify-between font-mono text-[11px] text-lab-faint">
                  slot {index + 1}
                  <span className={cn("size-1.5 rounded-full", session ? (session.ready ? "bg-[#3dd68c]" : "animate-pulse bg-[#f5d90a]") : "bg-lab-faint/50")} />
                </p>
                {session ? (
                  <>
                    <p className="mt-2 truncate text-[14px] font-semibold text-lab-strong">{game?.title ?? session.slug}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-lab-soft tabular-nums">{session.ready ? "streaming" : "booting"} · {minutes(session.ageSeconds)}</p>
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[#ff5fa2]" style={{ width: `${Math.min(100, (session.ageSeconds / (status?.lifetimeSeconds ?? 720)) * 100)}%` }} />
                  </>
                ) : (
                  <p className="mt-2 text-[14px] text-lab-faint">Free</p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-[13px] font-semibold text-lab-strong">Life of a sandbox</p>
        <ol className="mt-2 divide-y divide-lab-fg/[0.06] rounded-xl ring-1 ring-lab-fg/[0.06]">
          {LIFECYCLE.map(([title, detail], index) => (
            <li key={title} className="flex items-baseline gap-3 px-3 py-2.5">
              <span className="w-6 shrink-0 font-mono text-[11px] text-[#ff5fa2]">0{index + 1}</span>
              <span className="text-[13px] leading-relaxed"><b className="font-semibold text-lab-strong">{title}.</b> <span className="text-lab-soft">{detail}</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12px] leading-relaxed text-lab-faint">
          {status?.online
            ? "Only capacity and mission names are shown here, never who is playing."
            : "When the VM is off, sandbox missions offer an in-tab version instead, so nobody gets stuck."}
        </p>
      </div>
      <div className={cn(panel, "p-4 sm:p-5")}>
        <p className="flex items-center gap-2 text-[13px] font-semibold text-lab-strong"><Icon icon={ShieldCheckIcon} size={16} className="text-safe" />Isolation layers</p>
        <ul className="mt-3 space-y-3">
          {ISOLATION.map(([title, detail]) => (
            <li key={title} className="flex gap-3">
              <Icon icon={LockCloseIcon} size={14} className="mt-1 shrink-0 text-lab-faint" />
              <span className="text-[13px] leading-relaxed"><b className="font-semibold text-lab-text">{title}.</b> <span className="text-lab-soft">{detail}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The prediction network, trained live in the browser              */
/* ------------------------------------------------------------------ */

const SKILLS = ["Sender", "Links", "Urgency", "Authority", "Requests", "Attachments", "Trust"];
const FEATURES = ["bias", "all-time miss", "recent miss", "experience", "decisions right", "false flags", "days away"];

type Inputs = { allTime: number; recent: number; experience: number; accuracy: number; falseFlags: number; days: number };
const vector = (input: Inputs) => [1, input.allTime, input.recent, Math.log1p(input.experience), input.accuracy, input.falseFlags, Math.min(input.days, 60) / 60];
const sigmoid = (value: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Simulated players, each skill with a hidden pattern the model has to discover. */
function simulate(count: number) {
  const random = rng(42);
  const hidden = SKILLS.map((_, index) => ({ base: -1.2 + index * 0.18, recentPull: 1.4 + (index % 3) * 0.6 }));
  const rows: { skill: number; x: number[]; missed: number; available: number }[] = [];
  for (let player = 0; player < count; player += 1) {
    const accuracy = random();
    const falseFlags = random() * 0.4;
    const days = Math.floor(random() * 40);
    for (let skill = 0; skill < SKILLS.length; skill += 1) {
      const experience = Math.floor(random() * 12);
      const recent = random();
      const allTime = Math.min(1, recent * 0.6 + random() * 0.4);
      const truth = sigmoid(hidden[skill].base + hidden[skill].recentPull * recent + 0.8 * allTime - 1.6 * accuracy + 1.2 * falseFlags + 0.6 * (days / 60));
      const available = 1 + Math.floor(random() * 3);
      let missed = 0;
      for (let clue = 0; clue < available; clue += 1) if (random() < truth) missed += 1;
      rows.push({ skill, x: vector({ allTime, recent, experience, accuracy, falseFlags, days }), missed, available });
    }
  }
  return rows;
}

export function NetworkLab() {
  const rows = useMemo(() => simulate(400), []);
  const [weights, setWeights] = useState(() => SKILLS.map(() => FEATURES.map(() => 0)));
  const [epoch, setEpoch] = useState(0);
  const [losses, setLosses] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [skill, setSkill] = useState(1);
  const [input, setInput] = useState<Inputs>({ allTime: 0.4, recent: 0.6, experience: 5, accuracy: 0.6, falseFlags: 0.1, days: 7 });
  const weightsRef = useRef(weights);
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useReducedMotion();
  const seen = useInView(canvas, { once: true, margin: "-120px" });
  const autoStarted = useRef(false);

  const step = useCallback(() => {
    const next = weightsRef.current.map(w => [...w]);
    let loss = 0, total = 0;
    for (let s = 0; s < SKILLS.length; s += 1) {
      const gradient = FEATURES.map(() => 0);
      let count = 0;
      for (const row of rows) {
        if (row.skill !== s) continue;
        const p = sigmoid(next[s].reduce((sum, w, k) => sum + w * row.x[k], 0));
        const error = p * row.available - row.missed;
        row.x.forEach((value, k) => { gradient[k] += error * value; });
        loss -= row.missed * Math.log(p + 1e-9) + (row.available - row.missed) * Math.log(1 - p + 1e-9);
        count += row.available;
      }
      total += count;
      next[s] = next[s].map((w, k) => w - 0.6 * (gradient[k] / count + (k ? 0.01 * w : 0)));
    }
    weightsRef.current = next;
    setWeights(next);
    setEpoch(value => value + 1);
    setLosses(list => [...list.slice(-149), loss / total]);
  }, [rows]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { for (let i = 0; i < 3; i += 1) step(); }, still ? 200 : 40);
    return () => clearInterval(timer);
  }, [running, step, still]);

  // Start training by itself the first time it’s on screen, so it never sits at 50%.
  useEffect(() => {
    if (!seen || autoStarted.current) return;
    autoStarted.current = true;
    setRunning(true);
  }, [seen]);

  useEffect(() => {
    if (running && epoch >= 600) setRunning(false); // eslint-disable-line react-hooks/set-state-in-effect -- stop once converged
  }, [running, epoch]);

  const reset = () => {
    const zero = SKILLS.map(() => FEATURES.map(() => 0));
    weightsRef.current = zero;
    setWeights(zero);
    setEpoch(0);
    setLosses([]);
    setRunning(false);
  };

  const x = vector(input);
  const predictions = weights.map(w => sigmoid(w.reduce((sum, value, k) => sum + value * x[k], 0)));

  // Everything the animation loop needs, kept fresh without restarting it.
  const live = useRef({ weights, x, predictions, skill, running });
  const redraw = useRef<() => void>(() => {});
  useEffect(() => {
    live.current = { weights, x, predictions, skill, running };
    // With reduced motion there is no animation loop, so draw each change once.
    if (still) redraw.current();
  });

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    let frame = 0;
    const started = performance.now();
    const pink = [255, 95, 162], green = [61, 214, 140];
    const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    // Read the lab colours from CSS so the drawing follows light and dark mode.
    const hex = (value: string) => { const v = value.trim().replace("#", ""); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) || 0); };
    const palette = () => {
      const css = getComputedStyle(element);
      const token = (name: string) => css.getPropertyValue(name).trim() || "#000000";
      return { bg: token("--color-lab"), fg: hex(token("--color-lab-fg")), strong: token("--color-lab-strong"), text: token("--color-lab-text"), soft: token("--color-lab-soft"), faint: token("--color-lab-faint") };
    };

    const draw = (now: number) => {
      const { weights: w, x: inputs, predictions: out, skill: chosen, running: training } = live.current;
      const theme = palette();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = element.clientWidth, height = element.clientHeight;
      if (element.width !== Math.round(width * dpr) || element.height !== Math.round(height * dpr)) { element.width = Math.round(width * dpr); element.height = Math.round(height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const narrow = width < 620;
      const left = narrow ? Math.min(112, width * 0.33) : 168;
      const right = width - (narrow ? Math.min(120, width * 0.36) : 176);
      const pad = 34;
      const ys = (n: number) => Array.from({ length: n }, (_, i) => pad + (i * (height - pad * 2)) / (n - 1));
      const inY = ys(FEATURES.length), outY = ys(SKILLS.length);
      const max = Math.max(0.5, ...w.flat().map(Math.abs));
      const t = (now - started) / 1000;

      // Every input feeds every skill unit: 49 learned weights.
      for (let s = 0; s < SKILLS.length; s += 1) {
        const focus = s === chosen;
        for (let i = 0; i < FEATURES.length; i += 1) {
          const value = w[s][i];
          const strength = Math.min(1, Math.abs(value) / max);
          const color = value >= 0 ? pink : green;
          ctx.strokeStyle = rgba(color, focus ? 0.25 + 0.7 * strength : 0.04 + 0.12 * strength);
          ctx.lineWidth = focus ? 1 + 5 * strength : 0.6 + 1.4 * strength;
          const cx = (left + right) / 2;
          ctx.beginPath();
          ctx.moveTo(left, inY[i]);
          ctx.bezierCurveTo(cx, inY[i], cx, outY[s], right, outY[s]);
          ctx.stroke();

          // Signal pulses travel along the focused unit's wires (and faintly on all while training).
          if (!still && (focus || training) && strength > 0.05) {
            const speed = 0.35 + 0.5 * strength;
            const phase = (t * speed + i * 0.13 + s * 0.07) % 1;
            const u = phase, v = 1 - u;
            const px = v * v * v * left + 3 * v * v * u * cx + 3 * v * u * u * cx + u * u * u * right;
            const py = v * v * v * inY[i] + 3 * v * v * u * inY[i] + 3 * v * u * u * outY[s] + u * u * u * outY[s];
            ctx.fillStyle = rgba(color, focus ? 0.95 : 0.35);
            ctx.beginPath();
            ctx.arc(px, py, focus ? 2.6 : 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.textBaseline = "middle";
      // Input layer: node brightness and a small bar show the current value.
      FEATURES.forEach((name, i) => {
        const level = Math.min(1, Math.abs(inputs[i]));
        ctx.fillStyle = theme.bg;
        ctx.strokeStyle = rgba(theme.fg, 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(left, inY[i], 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = rgba(theme.fg, 0.2 + 0.8 * level);
        ctx.beginPath(); ctx.arc(left, inY[i], 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = "right";
        ctx.font = `500 ${narrow ? 11 : 13}px ui-sans-serif, system-ui`;
        ctx.fillStyle = theme.text;
        ctx.fillText(name, left - 22, inY[i] - 6);
        ctx.fillStyle = rgba(theme.fg, 0.08);
        ctx.fillRect(left - 22 - (narrow ? 60 : 84), inY[i] + 6, narrow ? 60 : 84, 3);
        ctx.fillStyle = rgba(theme.fg, 0.55);
        ctx.fillRect(left - 22 - (narrow ? 60 : 84) * level, inY[i] + 6, (narrow ? 60 : 84) * level, 3);
      });

      // Output layer: one sigmoid unit per skill, with a ring gauge of its prediction.
      SKILLS.forEach((name, s) => {
        const p = out[s];
        const focus = s === chosen;
        const r = focus ? 15 : 12;
        if (focus) {
          const glow = ctx.createRadialGradient(right, outY[s], 4, right, outY[s], 40);
          glow.addColorStop(0, "rgba(255,95,162,0.45)");
          glow.addColorStop(1, "rgba(255,95,162,0)");
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(right, outY[s], 40, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = theme.bg;
        ctx.beginPath(); ctx.arc(right, outY[s], r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(theme.fg, 0.12);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(right, outY[s], r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgba(pink, focus ? 1 : 0.65);
        ctx.beginPath(); ctx.arc(right, outY[s], r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
        ctx.fillStyle = focus ? theme.strong : theme.soft;
        ctx.font = `bold ${focus ? 11 : 10}px ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        ctx.fillText("σ", right, outY[s] + 0.5);
        ctx.textAlign = "left";
        ctx.font = `${focus ? 600 : 500} ${narrow ? 11 : 13}px ui-sans-serif, system-ui`;
        ctx.fillStyle = focus ? theme.strong : theme.soft;
        ctx.fillText(name, right + r + 12, outY[s] - 7);
        ctx.font = "11px ui-monospace, Menlo, monospace";
        ctx.fillStyle = focus ? "#ff5fa2" : theme.faint;
        ctx.fillText(`${Math.round(p * 100)}% miss`, right + r + 12, outY[s] + 8);
      });

      // Layer captions.
      ctx.font = "10px ui-monospace, Menlo, monospace";
      ctx.fillStyle = theme.faint;
      ctx.textAlign = "center";
      ctx.fillText("INPUTS · 7", left, 12);
      ctx.fillText("WEIGHTS · 49", (left + right) / 2, 12);
      ctx.fillText("SIGMOID UNITS · 7", right, 12);

      if (!still) frame = requestAnimationFrame(draw);
    };
    redraw.current = () => draw(performance.now());
    if (still) draw(performance.now());
    else frame = requestAnimationFrame(draw);
    // Without an animation loop, redraw once when the theme flips.
    const themeWatch = new MutationObserver(() => { if (still) draw(performance.now()); });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { cancelAnimationFrame(frame); themeWatch.disconnect(); };
  }, [still]);

  const [low, high] = losses.length ? [Math.min(...losses), Math.max(...losses)] : [0, 1];
  const lossPath = losses.length > 1
    ? losses.map((value, i) => `${i === 0 ? "M" : "L"}${(i / Math.max(1, losses.length - 1)) * 300},${6 + (1 - (value - low) / Math.max(1e-6, high - low)) * 58}`).join(" ")
    : "";
  const maxWeight = Math.max(0.5, ...weights.flat().map(Math.abs));

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className={cn(panel, "min-w-0 overflow-hidden")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-lab-fg/[0.06] p-3 sm:p-4">
          <button type="button" onClick={() => setRunning(value => !value)} className="flex h-9 items-center gap-2 rounded-lg bg-lab-strong px-4 text-[13px] font-semibold text-lab hover:bg-lab-text">
            <Icon icon={running ? PauseCircleIcon : PlayCircleIcon} size={16} />
            {running ? "Pause" : epoch ? "Resume training" : "Train on 400 simulated players"}
          </button>
          <button type="button" onClick={reset} className="flex h-9 items-center gap-2 rounded-lg bg-lab-fg/[0.06] px-3 text-[13px] font-medium text-lab-text hover:bg-lab-fg/10"><Icon icon={RefreshIcon} size={14} />Reset</button>
          <div className="ml-auto flex items-center gap-3 font-mono text-[12px] text-lab-soft tabular-nums">
            <span>epoch <b className="text-lab-strong">{epoch}</b></span>
            <span>loss <b className="text-lab-strong">{losses.at(-1)?.toFixed(3) ?? "–"}</b></span>
          </div>
        </div>
        <canvas ref={canvas} className="block h-[440px] w-full" role="img" aria-label={`A fully connected layer: seven inputs to seven sigmoid units. ${SKILLS[skill]} is focused at ${Math.round(predictions[skill] * 100)}% predicted miss chance.`} />
        <div className="border-t border-lab-fg/[0.06] p-3 sm:p-4">
          <p className="mb-2 text-[12px] text-lab-faint">Weight matrix. Click a row to focus that skill’s unit.</p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable weight matrix">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11px]">
              <thead>
                <tr><th />{FEATURES.map(name => <th key={name} className="px-1 pb-1 text-left font-medium text-lab-faint">{name}</th>)}</tr>
              </thead>
              <tbody>
                {SKILLS.map((name, s) => (
                  <tr key={name} onClick={() => setSkill(s)} className="cursor-pointer">
                    <th scope="row" className="pr-2 text-left whitespace-nowrap"><button type="button" aria-pressed={s === skill} onClick={event => { event.stopPropagation(); setSkill(s); }} className="min-h-8 rounded px-1 font-medium text-lab-text aria-pressed:text-lab-strong focus-visible:outline focus-visible:outline-pink-400">{name}</button></th>
                    {weights[s].map((value, k) => {
                      const strength = Math.min(1, Math.abs(value) / maxWeight);
                      return (
                        <td key={k} title={value.toFixed(3)} className={cn("h-7 rounded-md text-center font-mono tabular-nums transition-colors", s === skill ? "text-lab-strong ring-1 ring-lab-fg/30" : "text-lab-fg/60")}
                          style={{ background: value >= 0 ? `rgba(255,95,162,${0.06 + 0.6 * strength})` : `rgba(61,214,140,${0.06 + 0.6 * strength})` }}>
                          {value.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className={cn(panel, "p-4 sm:p-5")}>
          <p className="text-[13px] font-semibold text-lab-strong">Try a player</p>
          <p className="mt-0.5 text-[12px] text-lab-faint">Drag and watch every unit respond.</p>
          <div className="mt-4 space-y-4">
            <Range label="Recent miss rate" value={input.recent} min={0} max={1} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={value => setInput(current => ({ ...current, recent: value }))} />
            <Range label="All-time miss rate" value={input.allTime} min={0} max={1} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={value => setInput(current => ({ ...current, allTime: value }))} />
            <Range label="Decisions right" value={input.accuracy} min={0} max={1} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={value => setInput(current => ({ ...current, accuracy: value }))} />
            <Range label="False flags" value={input.falseFlags} min={0} max={0.6} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={value => setInput(current => ({ ...current, falseFlags: value }))} />
            <Range label="Clues seen" value={input.experience} min={0} max={30} onChange={value => setInput(current => ({ ...current, experience: value }))} />
            <Range label="Days since last run" value={input.days} min={0} max={60} format={value => `${value}d`} onChange={value => setInput(current => ({ ...current, days: value }))} />
          </div>
        </div>
        <div className={cn(panel, "p-4 sm:p-5")}>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-lab-strong">Training loss</p>
            <span className="font-mono text-[11px] text-lab-faint">{losses.length ? `${high.toFixed(3)} → ${losses.at(-1)!.toFixed(3)}` : "not trained"}</span>
          </div>
          <svg viewBox="0 0 300 70" className="mt-2 h-20 w-full" role="img" aria-label="Training loss over time">
            <defs>
              <linearGradient id="loss-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ff5fa2" stopOpacity="0.35" />
                <stop offset="1" stopColor="#ff5fa2" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,66 H300" stroke="currentColor" strokeOpacity="0.12" />
            {lossPath && <path d={`${lossPath} L300,70 L0,70 Z`} fill="url(#loss-fill)" />}
            {lossPath && <path d={lossPath} fill="none" stroke="#ff5fa2" strokeWidth="2" strokeLinejoin="round" />}
          </svg>
          <p className="text-[12px] text-lab-faint">Log-loss per clue. It falls as each unit learns its skill’s hidden pattern.</p>
        </div>
      </div>
    </div>
  );
}

/** Headline numbers for the page hero. */
export function LabStats() {
  const stats: [string, string][] = [[String(games.length), "missions"], ["2", "levels to a certificate"], [String(BADGES.length), "badges"], ["7", "skills predicted"], ["4", "isolated sandboxes"]];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-lab-fg/[0.06] sm:grid-cols-5">
      {stats.map(([value, label]) => (
        <div key={label} className="bg-lab p-4 sm:p-5">
          <dt className="text-[12px] text-lab-faint">{label}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-lab-strong tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 max-w-3xl">
      <p className="flex items-center gap-2 text-[12px] font-medium tracking-wide text-[#ff5fa2] uppercase"><Icon icon={BulbOnIcon} size={13} />{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-lab-strong sm:text-3xl">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-lab-soft">{children}</p>
    </div>
  );
}

export function LabFade({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, ease: "easeOut" }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
