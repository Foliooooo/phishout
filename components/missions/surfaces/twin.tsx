"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { Address } from "../browser-chrome";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { FolderIcon, Icon, KeyLeftIcon, LaptopIcon, LockCloseIcon, NotificationBellOnIcon, PlusIcon } from "../icon";
import { InspectButton, SceneIn } from "./shared";

/** Double Trouble: two windows that look identical until you put them side by side. */
function TwinSurface({ view, scene, site, busy, start, inspect, act }: SurfaceProps) {
  if (!scene) {
    return (
      <div className="flex h-full flex-col bg-[#f8fafc] text-[#0f172a]">
        <header className="flex h-12 items-center gap-3 border-b border-[#e2e8f0] bg-white px-5">
          <span className="flex size-6 items-center justify-center rounded-md bg-[#0284c7] text-[11px] font-bold text-white">N</span>
          <b className="text-[14px] font-semibold">{site.name}</b>
          <span className="ml-auto text-[12px] text-[#64748b]">{site.account}</span>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-[18px] font-semibold">{site.section}</h2>
          <p className="mt-1 text-[13px] text-[#64748b]">{site.intro}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {site.rows.map(([from, title, when, body]) => (
              <div key={title} className="rounded-lg bg-white p-4 ring-1 ring-[#e2e8f0]">
                <Icon icon={FolderIcon} size={18} className="text-[#0284c7]" />
                <p className="mt-3 text-[14px] font-medium">{title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] text-[#64748b]">{body}</p>
                <p className="mt-3 text-[11px] text-[#94a3b8]">{from} · {when}</p>
              </div>
            ))}
            <button type="button" disabled={busy} onClick={start} className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#94a3b8] text-[13px] font-medium text-[#0284c7] transition-colors hover:border-[#0284c7] hover:bg-[#f0f9ff]">
              <Icon icon={PlusIcon} size={18} />{site.task}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPrompt = /approve|sign-in\?/i.test(scene.subject);
  const saved = scene.clues?.find(clue => /saved|current|original/i.test(clue.field))?.value.split(" ")[0] ?? "accounts.novabyte.example";
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#e8ecf1]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#d5dbe3] bg-[#f4f6f9] px-4 py-2">
        <InspectButton scene={scene} onInspect={inspect} busy={busy} className="h-7" />
        {!scene.inspected && <span className="text-[12px] text-[#64748b]">Opens your saved tab next to this one.</span>}
      </div>
      <div className={cn("grid flex-1 gap-3 p-3 sm:p-4", scene.inspected && "lg:grid-cols-2")}>
        <SceneIn id={view.step} className="min-h-0">
          <Window address={scene.address} label="Current tab">
            <div className="mx-auto max-w-[360px]">
              {isPrompt ? (
                <div className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fef3c7] text-[#b45309]"><Icon icon={NotificationBellOnIcon} size={22} /></span>
                  <p className="mt-4 text-[12px] font-medium text-[#64748b]">{scene.sender}</p>
                  <h2 className="mt-1 text-[20px] font-semibold">{scene.subject}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#475569]">{scene.message}</p>
                  <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] text-[#475569]"><Icon icon={LaptopIcon} size={14} />Unknown device · just now</p>
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-medium text-[#64748b]">{scene.sender}</p>
                  <h2 className="mt-1 text-[20px] font-semibold">{scene.subject}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#475569]">{scene.message}</p>
                  <div className="mt-5 space-y-2.5">
                    <span className="flex h-10 items-center rounded-md border border-[#cbd5e1] px-3 text-[14px] text-[#94a3b8]">sam@novabyte.example</span>
                    <span className="flex h-10 items-center gap-2 rounded-md border border-[#cbd5e1] px-3 text-[14px] text-[#94a3b8]">
                      <Icon icon={LockCloseIcon} size={14} />••••••••
                      <span className="ml-auto flex items-center gap-1 text-[11px]"><Icon icon={KeyLeftIcon} size={13} />Autofill</span>
                    </span>
                  </div>
                </>
              )}
              <div className="mt-6 grid gap-2">
                {scene.actions.map((label, index) => (
                  <button key={label} type="button" disabled={busy} onClick={() => act(index)} className={cn("h-10 rounded-md text-[14px] font-medium transition-colors disabled:opacity-50", index === 0 ? "bg-[#0284c7] text-white hover:bg-[#0369a1]" : "border border-[#cbd5e1] bg-white text-[#334155] hover:bg-[#f8fafc]")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Window>
        </SceneIn>
        <AnimatePresence>
          {scene.inspected && scene.clues && (
            <motion.div className="min-h-0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <Window address={saved} label="Saved tab">
                <p className="text-[13px] font-medium text-[#334155]">Side by side</p>
                <table className="mt-3 w-full text-left text-[13px]">
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {scene.clues.map(clue => (
                      <tr key={clue.field} className={cn(clue.tagged && "bg-[#fef2f2]")}>
                        <th className="w-28 py-2.5 pr-3 align-top text-[12px] font-medium text-[#64748b]">{clue.field}</th>
                        <td className="py-2.5 break-all text-[#0f172a]">{clue.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Window>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Window({ address, label, children }: { address: string; label: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white text-[#0f172a] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-[#d5dbe3]">
      <div className="flex h-9 items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-3 text-[12px]">
        <span className="font-medium text-[#475569]">{label}</span>
        <span className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded bg-white px-2 ring-1 ring-[#e2e8f0]">
          <Icon icon={LockCloseIcon} size={11} className="shrink-0 text-[#64748b]" />
          <Address address={address} className="min-w-0" />
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

export const twinSkin: Skin = {
  accent: "#38bdf8",
  tabTitle: view => (view.scene ? view.scene.surface : `${view.site.name} – Dashboard`),
  tabIcon: <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#0284c7] text-[9px] font-bold text-white">N</span>,
  Surface: TwinSurface,
};
