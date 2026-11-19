"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { AlertTriangleIcon, DownloadBarDownIcon, FileIcon, FolderIcon, Icon, Package01Icon } from "../icon";
import { play } from "../sfx";
import { InspectButton, SceneIn } from "./shared";

const TYPES: Record<string, [string, string]> = {
  pdf: ["#d93025", "PDF"], xlsm: ["#188038", "XLSM"], xlsx: ["#188038", "XLSX"], exe: ["#5f6368", "EXE"], zip: ["#e37400", "ZIP"],
};

function typeOf(name: string) {
  const ext = name.split(".").at(-1)?.toLowerCase() ?? "";
  return TYPES[ext] ?? ["#1a73e8", ext.toUpperCase()];
}

/** Download Roulette: files land in the browser’s download panel; read them to the last dot. */
function DownloadSurface({ view, scene, site, busy, opened, open, start, inspect, act }: SurfaceProps) {
  const [progress, setProgress] = useState(0);
  const [seen, setSeen] = useState(view.step);
  if (seen !== view.step) {
    setSeen(view.step);
    setProgress(0);
  }
  useEffect(() => {
    if (!scene) return;
    const timer = setInterval(() => setProgress(value => {
      if (value >= 100) {
        clearInterval(timer);
        return 100;
      }
      const next = Math.min(100, value + 6 + Math.random() * 10);
      if (next === 100) play("ding");
      return next;
    }), 120);
    return () => clearInterval(timer);
  }, [scene, view.step]);

  const done = progress >= 100;
  const label = scene ? typeOf(scene.subject)[1] : "";

  return (
    <div className="relative flex h-full bg-[#f8f9fa] text-[#202124]">
      <aside className="hidden w-52 shrink-0 border-r border-[#e8eaed] bg-white p-4 sm:block">
        <p className="flex items-center gap-2 text-[14px] font-semibold"><Icon icon={Package01Icon} size={18} className="text-[#7c3aed]" />{site.name}</p>
        <nav className="mt-6 space-y-1 text-[13px]">
          <span className="flex items-center gap-2 rounded-md bg-[#f3e8ff] px-2 py-1.5 font-medium text-[#6d28d9]"><Icon icon={FolderIcon} size={15} />Deliveries</span>
          <span className="flex items-center gap-2 px-2 py-1.5 text-[#5f6368]"><Icon icon={FileIcon} size={15} />Shared with me</span>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {!scene ? (
          <div className="p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold">{site.section}</h2>
              <button type="button" disabled={busy} onClick={start} className="ml-auto h-8 rounded-md bg-[#7c3aed] px-3 text-[13px] font-medium text-white hover:bg-[#6d28d9]">{site.task}</button>
            </div>
            <p className="mt-1 text-[13px] text-[#5f6368]">{site.intro}</p>
            <ul className="mt-5 divide-y divide-[#eef0f2] rounded-lg bg-white ring-1 ring-[#e8eaed]">
              {site.rows.map(([from, title, when]) => (
                <li key={title} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <FileBadge name={title} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{title}</span><span className="text-[12px] text-[#5f6368]">{from}</span></span>
                  <span className="text-[12px] text-[#5f6368]">{when}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <SceneIn id={view.step} className="mx-auto max-w-xl p-6">
            <p className="text-[12px] font-medium text-[#5f6368]">{scene.sender}</p>
            <h2 className="mt-1 text-[20px] font-semibold">{scene.surface === "Browser downloads" ? "New delivery" : scene.surface}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[#3c4043]">{scene.message}</p>
            {opened ? (
              <div className="mt-6 rounded-lg bg-white ring-1 ring-[#e8eaed]">
                {/xlsm|macro/i.test(scene.subject) && (
                  <div className="flex items-center gap-2 rounded-t-lg border-b border-[#fbe1a6] bg-[#fef7e0] px-4 py-2 text-[12px] text-[#7a4a00]">
                    <Icon icon={AlertTriangleIcon} size={14} /><b className="font-semibold">Security warning</b> Macros have been disabled.
                    <span className="ml-auto rounded border border-[#e3c065] bg-white px-2 py-0.5 font-medium">Enable content</span>
                  </div>
                )}
                <div className="flex items-center gap-4 p-5">
                  <FileBadge name={scene.subject} large />
                  <div className="min-w-0">
                    <p className="font-mono text-[15px] break-all">{scene.subject}</p>
                    <p className="text-[12px] text-[#5f6368]">{label} file · 4.2 MB · {scene.sender}</p>
                  </div>
                </div>
                <div className="border-t border-[#f1f3f4] px-5 py-3"><InspectButton scene={scene} onInspect={inspect} busy={busy} /></div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-[#f1f3f4] px-5 py-3">
                  {scene.actions.map((action, index) => (
                    <button key={action} type="button" disabled={busy || !done} onClick={() => act(index)} className={cn("h-9 rounded-md px-4 text-[13px] font-medium transition-colors disabled:opacity-40", /open|enable/i.test(action) ? "bg-[#1a73e8] text-white hover:bg-[#1765cc]" : "border border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]")}>
                      {action}
                    </button>
                  ))}
                </div>
                {!done && <p className="px-5 pb-3 text-[12px] text-[#5f6368]">Waiting for the download to finish…</p>}
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-4 rounded-lg bg-white p-4 ring-1 ring-[#e8eaed]">
                <FileBadge name={scene.subject} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{scene.subject}</p>
                  <p className="text-[12px] text-[#5f6368]">Shared by {scene.sender.split(" · ")[0]} · just now</p>
                </div>
                <button type="button" onClick={open} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#1a73e8] px-4 text-[13px] font-medium text-white hover:bg-[#1765cc]">
                  <Icon icon={DownloadBarDownIcon} size={15} />{scene.entry}
                </button>
              </div>
            )}
          </SceneIn>
        )}
      </div>

      <AnimatePresence>
        {scene && !opened && (
          <motion.div
            key={view.step}
            role="dialog"
            aria-label="Recent downloads"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-2 right-3 z-20 w-[320px] rounded-lg bg-white p-3 shadow-[0_4px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/10"
          >
            <p className="px-1 pb-2 text-[13px] font-medium">Recent download history</p>
            <button type="button" onClick={open} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-[#f1f3f4]">
              <FileBadge name={scene.subject} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]" style={{ color: done ? undefined : "#202124" }}>{scene.subject}</span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#e8eaed]"><span className="block h-full bg-[#1a73e8] transition-[width]" style={{ width: `${progress}%` }} /></span>
                <span className="mt-1 block text-[11px] text-[#5f6368]">{done ? "4.2 MB · Done" : `${(progress * 0.042).toFixed(1)} of 4.2 MB`}</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileBadge({ name, large }: { name: string; large?: boolean }) {
  const [color, label] = typeOf(name);
  return (
    <span className={cn("flex shrink-0 items-end justify-center rounded-[4px] pb-1 font-semibold text-white", large ? "h-14 w-11 text-[10px]" : "h-8 w-6 text-[7px]")} style={{ background: color }}>
      {label}
    </span>
  );
}

export const downloadSkin: Skin = {
  accent: "#a78bfa",
  tabTitle: view => (view.scene ? `${view.scene.subject} – Quickshare` : `${view.site.name} – Deliveries`),
  tabIcon: <Icon icon={Package01Icon} size={14} className="text-[#7c3aed]" />,
  bookmarks: [
    { label: "Vendor portal", address: "vendors.quickshare.example" },
    { label: "Billing records", address: "finance.novabyte.example/billing" },
    { label: "Projects", address: "projects.novabyte.example" },
  ],
  Surface: DownloadSurface,
};
