"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * What the VM controller does when you open a sandbox, shown step by step.
 * The order is real (see sandbox/src/main.rs); the pacing is approximate,
 * because the controller reports only "starting" and "live".
 */
const STEPS = [
  ["alloc", "Reserving one of 4 sandbox slots"],
  ["docker", "Creating a disposable container (no network, capped CPU and memory)"],
  ["profile", "Mounting a fresh browser profile that is deleted on exit"],
  ["display", "Starting a virtual display"],
  ["chromium", "Launching Chromium on the mission’s fictional sites"],
  ["video", "Starting the H.264 video stream"],
  ["input", "Connecting your mouse and keyboard over a private socket"],
] as const;

export function SandboxBoot({ slug, done }: { slug: string; done?: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setStep(value => Math.min(STEPS.length - 1, value + 1)), 650);
    return () => clearInterval(timer);
  }, [done]);
  const current = done ? STEPS.length : step;

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-[#0f0f12] text-left font-mono text-[13px] text-zinc-300 ring-1 ring-white/10">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-[12px] text-zinc-500">
        <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#ff5f57]" /><i className="size-2.5 rounded-full bg-[#febc2e]" /><i className="size-2.5 rounded-full bg-[#28c840]" /></span>
        <span className="ml-2">phishout-vm · sandbox/{slug}</span>
      </div>
      <ol className="space-y-1.5 p-4" aria-live="polite">
        {STEPS.map(([key, label], index) => {
          const state = index < current ? "done" : index === current ? "running" : "waiting";
          return (
            <li key={key} className={cn("flex gap-3", state === "waiting" && "opacity-35")}>
              <span className={cn("w-12 shrink-0", state === "done" ? "text-[#3dd68c]" : state === "running" ? "text-[#f5d90a]" : "text-zinc-600")}>
                {state === "done" ? "[ ok ]" : state === "running" ? "[ .. ]" : "[    ]"}
              </span>
              <span>{label}{state === "running" && <span className="animate-pulse">_</span>}</span>
            </li>
          );
        })}
        {done && <li className="pt-1 text-[#3dd68c]">sandbox ready. streaming.</li>}
      </ol>
    </div>
  );
}
