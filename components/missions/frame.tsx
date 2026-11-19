"use client";

import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";
import { animate, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, FlagIcon, Icon, LayoutGridStackUpIcon, BulbOnIcon, SpeakerOnIcon, VolumeTwoIcon } from "./icon";
import { isMuted, play, setMuted } from "./sfx";

const hudButton = "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white";

/**
 * The full-viewport stage every game plays in. It covers the site chrome,
 * locks page scroll and carries a compact toolbar: exit, progress, XP,
 * evidence, sound and fullscreen.
 */
export function GameFrame({
  game, accent, step, total, xp, onEvidence, evidenceOpen, evidenceCount, onCoach, coachOpen, children,
}: {
  game: Game; accent: string; step: number; total: number; xp: number;
  onEvidence?: () => void; evidenceOpen?: boolean; evidenceCount?: number;
  onCoach?: () => void; coachOpen?: boolean; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [muted, setMute] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // Mirror the stored preference once mounted (localStorage is client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMute(isMuted());
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.documentElement.style.overflow = previous;
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      // Fullscreen can be refused (iOS, embedded frames). The stage already fills the window.
    }
  };

  const shown = Math.min(step + 1, total);

  return (
    <div ref={root} className="fixed inset-0 z-[80] flex flex-col bg-[#0f0f12] font-sans text-zinc-100">
      <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/[0.06] px-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/games/${game.slug}`} className={hudButton} aria-label="Exit mission">
            <Icon icon={ArrowLeftIcon} size={16} />
            <span className="hidden sm:inline">Exit</span>
          </Link>
          <span aria-hidden className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-white">{game.title}</p>
            <p className="hidden truncate text-[11px] text-zinc-500 sm:block">{game.skill}</p>
          </div>
        </div>

        <div className="flex items-center gap-3" aria-label={`Situation ${shown} of ${total}`}>
          <span className="hidden text-[12px] text-zinc-400 tabular-nums md:inline">Situation {shown} of {total}</span>
          <ol className="flex gap-1">
            {Array.from({ length: total }, (_, index) => (
              <li
                key={index}
                className={cn("h-1 w-7 rounded-full transition-colors duration-500", index > step && "bg-white/15")}
                style={index <= step ? { background: index < step ? accent : `color-mix(in srgb, ${accent} 55%, transparent)` } : undefined}
              />
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-end gap-1">
          {onCoach && (
            <button type="button" onClick={onCoach} aria-pressed={coachOpen} className={cn(hudButton, coachOpen && "bg-white/[0.08] text-white")}>
              <Icon icon={BulbOnIcon} size={15} />
              <span className="hidden sm:inline">Coach</span>
            </button>
          )}
          {onEvidence && (
            <button type="button" onClick={onEvidence} aria-pressed={evidenceOpen} className={cn(hudButton, evidenceOpen && "bg-white/[0.08] text-white")}>
              <Icon icon={FlagIcon} size={15} />
              <span className="hidden sm:inline">Evidence</span>
              {Boolean(evidenceCount) && <span className="rounded bg-[#e5484d] px-1 text-[11px] font-semibold text-white tabular-nums">{evidenceCount}</span>}
            </button>
          )}
          <span className="flex h-8 items-center gap-1 rounded-md bg-white/[0.06] px-2.5 text-[13px] font-semibold whitespace-nowrap tabular-nums">
            <span style={{ color: accent }}><CountUp value={xp} /></span>
            <span className="text-[11px] font-medium text-zinc-500">XP</span>
          </span>
          <button
            type="button"
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            aria-pressed={!muted}
            onClick={() => { setMuted(!muted); setMute(!muted); if (muted) play("click"); }}
            className={cn(hudButton, "w-8 justify-center px-0", muted && "text-zinc-600")}
          >
            <Icon icon={muted ? SpeakerOnIcon : VolumeTwoIcon} size={16} />
          </button>
          <button type="button" onClick={() => void toggleFull()} aria-label={full ? "Exit full screen" : "Full screen"} aria-pressed={full} className={cn(hudButton, "hidden w-8 justify-center px-0 sm:flex")}>
            <Icon icon={LayoutGridStackUpIcon} size={16} />
          </button>
        </div>
      </header>
      <main className="relative min-h-0 flex-1 p-2 sm:p-3">{children}</main>
    </div>
  );
}

export function CountUp({ value, duration = 0.6 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const still = useReducedMotion();
  useEffect(() => {
    if (still) {
      from.current = value;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: latest => setShown(Math.round(latest)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, still]);
  return <>{shown}</>;
}

/** A short burst of confetti on a canvas. Skipped under reduced motion. */
export function Confetti({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const still = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || still) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const colors = [accent, "#ffffff", "#a1a1aa"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: canvas.width * (0.3 + Math.random() * 0.4), y: canvas.height * 0.25,
      vx: (Math.random() - 0.5) * 16 * dpr, vy: (Math.random() * -14 - 4) * dpr,
      size: (Math.random() * 4 + 4) * dpr, spin: Math.random() * 6, angle: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let ticks = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, 1 - ticks / 200);
      for (const piece of pieces) {
        piece.vy += 0.4 * dpr;
        piece.vx *= 0.99;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.angle += piece.spin * 0.05;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        ctx.restore();
      }
      ticks += 1;
      if (ticks < 200) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [accent, still]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[90] h-full w-full" />;
}

export function LoadingStage({ title }: { title: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-[#0f0f12] font-sans text-zinc-100" role="status">
      <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-white/15 border-t-white/80" />
      <p className="text-[13px] text-zinc-400">Loading {title}</p>
    </div>
  );
}

export function ProblemStage({ title, body, href, action, onRetry }: { title: string; body: string; href?: string; action?: string; onRetry?: () => void }) {
  const primary = "inline-flex h-9 items-center rounded-md bg-white px-4 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f0f12] p-6 font-sans text-zinc-100" role="alert">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{body}</p>
        <div className="mt-5 flex gap-2">
          {href && <Link href={href} className={primary}>{action}</Link>}
          {onRetry && <button type="button" onClick={onRetry} className={primary}>Try again</button>}
          <Link href="/games" className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-zinc-300 ring-1 ring-white/15 hover:bg-white/5">All games</Link>
        </div>
      </div>
    </div>
  );
}
