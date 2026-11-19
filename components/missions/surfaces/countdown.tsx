"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import type { SceneMissionView } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { AlarmIcon, AlertTriangleIcon, CalendarIcon, CloudIcon, File02Icon, FolderIcon, Icon, UploadUpIcon } from "../icon";
import { play } from "../sfx";
import { InspectButton, SceneIn } from "./shared";

/** Seconds parsed from "Access expires in 02:00"; follow-up notices get a short fake deadline. */
function deadlineOf(view: SceneMissionView) {
  if (!view.scene) return null;
  const match = view.scene.subject.match(/(\d{1,2}):(\d{2})/);
  if (match && /expire|in /i.test(view.scene.subject)) return Number(match[1]) * 60 + Number(match[2]);
  return /last step|code/i.test(view.scene.subject + view.scene.message) ? 45 : null;
}

function useCountdown(view: SceneMissionView) {
  const total = deadlineOf(view);
  const sceneKey = `${view.step}:${view.scene?.subject ?? ""}`;
  const [left, setLeft] = useState(total);
  const [key, setKey] = useState(sceneKey);
  if (key !== sceneKey) {
    setKey(sceneKey);
    setLeft(total);
  }
  useEffect(() => {
    if (total === null) return;
    const timer = setInterval(() => setLeft(value => {
      if (value === null || value <= 0) return value;
      if (value <= 11) play("tick");
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [total, sceneKey]);
  return { total, left };
}

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** Tick Tock: a cloud storage app interrupted by notices with countdowns that don’t matter. */
function CountdownSurface({ view, scene, site, busy, start, inspect, act }: SurfaceProps) {
  const { total, left } = useCountdown(view);
  const urgent = left !== null && total !== null && left < total * 0.35;

  if (!scene) {
    return (
      <div className="flex h-full bg-white text-[#1f2937]">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[#eef0f3] bg-[#fafbfc] p-4 sm:flex">
          <p className="flex items-center gap-2 text-[14px] font-semibold"><Icon icon={CloudIcon} size={18} className="text-[#2563eb]" />{site.name}</p>
          <nav className="mt-6 space-y-1 text-[13px]">
            <span className="flex items-center gap-2 rounded-md bg-[#eff6ff] px-2 py-1.5 font-medium text-[#1d4ed8]"><Icon icon={FolderIcon} size={15} />My files</span>
            <span className="flex items-center gap-2 px-2 py-1.5 text-[#4b5563]"><Icon icon={CalendarIcon} size={15} />Recent</span>
          </nav>
          <div className="mt-auto">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]"><div className="h-full w-[72%] rounded-full bg-[#2563eb]" /></div>
            <p className="mt-1.5 text-[11px] text-[#6b7280]">7.2 GB of 10 GB used</p>
          </div>
        </aside>
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-14 items-center gap-3 border-b border-[#eef0f3] px-6">
            <h2 className="text-[16px] font-semibold">My files</h2>
            <button type="button" disabled={busy} onClick={start} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2563eb] px-3 text-[13px] font-medium text-white hover:bg-[#1d4ed8]">
              <Icon icon={UploadUpIcon} size={15} />{site.task}
            </button>
          </div>
          <p className="px-6 pt-4 text-[13px] text-[#6b7280]">{site.intro}</p>
          <table className="mt-2 w-full text-left text-[13px]">
            <thead className="text-[12px] text-[#6b7280]"><tr><th className="px-6 py-2 font-medium">Name</th><th className="py-2 font-medium">Owner</th><th className="px-6 py-2 text-right font-medium">Modified</th></tr></thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {site.rows.map(([from, title, when]) => (
                <tr key={title}><td className="flex items-center gap-2 px-6 py-2.5"><Icon icon={File02Icon} size={15} className="text-[#6b7280]" />{title}</td><td className="text-[#6b7280]">{from}</td><td className="px-6 text-right text-[#6b7280]">{when}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f5f5f4] text-[#1c1917]">
      {left !== null && (
        <div className={cn("flex items-center gap-3 px-6 py-2.5 text-[13px] text-white transition-colors", urgent ? "bg-[#b91c1c]" : "bg-[#dc2626]")} role="timer" aria-live="off">
          <Icon icon={AlarmIcon} size={16} />
          <span className="font-medium">Your access will be suspended in</span>
          <span className="font-mono text-[15px] font-semibold tabular-nums">{clock(left)}</span>
        </div>
      )}
      <SceneIn id={view.step} className="m-auto w-full max-w-[460px] p-6">
        <div className="rounded-lg bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-[#e7e5e4]">
          <p className="flex items-center gap-2 text-[12px] font-medium text-[#78716c]">
            <Icon icon={left !== null ? AlertTriangleIcon : CalendarIcon} size={15} className={cn(left !== null ? "text-[#dc2626]" : "text-[#78716c]")} />
            {scene.surface} · {scene.sender}
          </p>
          <h2 className="mt-3 text-[22px] font-semibold tracking-tight">{scene.subject}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#57534e]">{scene.message}</p>
          {left !== null && (
            <div className="mt-5 flex items-baseline gap-2 border-y border-[#f5f5f4] py-4">
              <span className={cn("font-mono text-[40px] leading-none font-semibold tabular-nums", urgent ? "text-[#b91c1c]" : "text-[#1c1917]")}>{clock(left)}</span>
              <span className="text-[12px] text-[#78716c]">remaining</span>
            </div>
          )}
          {left === 0 && <p className="mt-3 text-[13px] text-[#57534e]">The timer ran out and nothing happened. Fake deadlines rarely enforce themselves.</p>}
          <div className="mt-5 grid gap-2">
            {scene.actions.map((label, index) => (
              <button key={label} type="button" disabled={busy} onClick={() => act(index)} className={cn("h-10 rounded-md text-[14px] font-medium transition-colors disabled:opacity-50", /restore|share|flag/i.test(label) ? "bg-[#dc2626] text-white hover:bg-[#b91c1c]" : "border border-[#d6d3d1] bg-white text-[#292524] hover:bg-[#fafaf9]")}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5"><InspectButton scene={scene} onInspect={inspect} busy={busy} /></div>
        </div>
        <p className="mt-3 text-center text-[12px] text-[#a8a29e]">The countdown adds pressure. It never costs you points.</p>
      </SceneIn>
    </div>
  );
}

export const countdownSkin: Skin = {
  accent: "#fb923c",
  tabTitle: view => (view.scene ? view.scene.surface : `${view.site.name} – My files`),
  tabIcon: <Icon icon={CloudIcon} size={14} className="text-[#2563eb]" />,
  bookmarks: [
    { label: "Storage", address: "storage.novabyte.example/files" },
    { label: "Storage status", address: "storage.novabyte.example/status" },
    { label: "IT calendar", address: "it.novabyte.example/calendar" },
  ],
  Surface: CountdownSurface,
};
