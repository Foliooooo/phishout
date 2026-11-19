"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FolderIcon, Icon, LinkSlantIcon, LockCloseIcon, UserIcon } from "../icon";
import { InspectButton, SceneIn } from "./shared";

/** Spot the Lookalike: sign-in pages that look right. Only the address bar can tell. */
function LoginSurface({ view, scene, site, busy, start, inspect, act }: SurfaceProps) {
  if (!scene) {
    return (
      <div className="flex h-full flex-col bg-[#f7f8fa] text-[#1b1f24]">
        <header className="flex h-12 items-center gap-3 border-b border-[#e5e7eb] bg-white px-5">
          <span className="flex size-6 items-center justify-center rounded-md bg-[#4f46e5] text-[11px] font-bold text-white">N</span>
          <b className="text-[14px] font-semibold">{site.name}</b>
          <span className="ml-auto text-[12px] text-[#6b7280]">{site.account}</span>
        </header>
        <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
          <h2 className="text-[18px] font-semibold">{site.section}</h2>
          <p className="mt-1 text-[13px] text-[#6b7280]">{site.intro}</p>
          <table className="mt-5 w-full overflow-hidden rounded-lg bg-white text-left text-[13px] ring-1 ring-[#e5e7eb]">
            <thead className="bg-[#f9fafb] text-[12px] text-[#6b7280]"><tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Owner</th><th className="px-4 py-2 text-right font-medium">Modified</th></tr></thead>
            <tbody className="divide-y divide-[#f1f2f4]">
              {site.rows.map(([from, title, when]) => (
                <tr key={title}><td className="flex items-center gap-2 px-4 py-2.5"><Icon icon={FolderIcon} size={16} className="text-[#6b7280]" />{title}</td><td className="px-4 py-2.5 text-[#6b7280]">{from}</td><td className="px-4 py-2.5 text-right text-[#6b7280]">{when}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex items-center gap-3 rounded-lg bg-white p-4 ring-1 ring-[#e5e7eb]">
            <Icon icon={LinkSlantIcon} size={18} className="text-[#4f46e5]" />
            <p className="flex-1 text-[13px]">Your group shared a new link to the project folder.</p>
            <button type="button" disabled={busy} onClick={start} className="h-8 rounded-md bg-[#4f46e5] px-3 text-[13px] font-medium text-white hover:bg-[#4338ca]">{site.task}</button>
          </div>
        </div>
      </div>
    );
  }

  const safe = scene.actions.findIndex(label => /bookmark|saved|read|discard/i.test(label));
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f3f4f6] text-[#1b1f24]">
      <div className="flex items-center gap-2 border-b border-[#e5e7eb] bg-white px-4 py-2 text-[12px] text-[#6b7280]">
        <Icon icon={LockCloseIcon} size={13} />
        <span>Not sure where you are? Click the padlock in the address bar.</span>
        <InspectButton scene={scene} onInspect={inspect} busy={busy} className="ml-auto h-7" />
      </div>
      <SceneIn id={view.step} className="m-auto grid w-full max-w-[860px] overflow-hidden p-6 lg:grid-cols-[1fr_400px] lg:gap-0">
        <div className="relative hidden overflow-hidden rounded-l-xl bg-[#e5e7eb] lg:block">
          <Image src="/missions/photos/workspace-desk.jpg" alt="" fill sizes="460px" className="object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b]/80 to-transparent" />
          <p className="absolute right-6 bottom-6 left-6 text-[18px] leading-snug font-semibold text-white">Everything your team is working on, in one place.</p>
        </div>
        <div>
        <div className="rounded-xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-[#e5e7eb] lg:rounded-l-none">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-[#4f46e5] text-[12px] font-bold text-white">N</span>
            <span className="text-[15px] font-semibold">{scene.surface}</span>
          </div>
          <h2 className="mt-6 text-[20px] font-semibold">{scene.subject}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6b7280]">{scene.message}</p>
          <div className="mt-5 space-y-3">
            <label className="block text-[12px] font-medium text-[#374151]">Email
              <span className="mt-1 flex h-10 items-center gap-2 rounded-md border border-[#d1d5db] px-3 text-[14px] font-normal text-[#9ca3af]"><Icon icon={UserIcon} size={15} />sam@novabyte.example</span>
            </label>
            <label className="block text-[12px] font-medium text-[#374151]">Password
              <span className="mt-1 flex h-10 items-center gap-2 rounded-md border border-[#d1d5db] px-3 text-[14px] font-normal text-[#9ca3af]"><Icon icon={LockCloseIcon} size={15} />••••••••••</span>
            </label>
          </div>
          <div className="mt-6 grid gap-2">
            {scene.actions.map((label, index) => (
              <button
                key={label}
                type="button"
                disabled={busy}
                onClick={() => act(index)}
                className={cn("h-10 rounded-md text-[14px] font-medium transition-colors disabled:opacity-50", index === safe ? "border border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb]" : "bg-[#4f46e5] text-white hover:bg-[#4338ca]")}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-center text-[11px] text-[#9ca3af]">Practice page. Real credentials can’t be entered.</p>
        </div>
        <p className="mt-4 text-center text-[12px] text-[#6b7280]">{scene.sender}</p>
        </div>
      </SceneIn>
    </div>
  );
}

export const loginSkin: Skin = {
  accent: "#818cf8",
  tabTitle: view => (view.scene ? `Sign in – ${view.scene.surface}` : `${view.site.name} – Files`),
  tabIcon: <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#4f46e5] text-[9px] font-bold text-white">N</span>,
  bookmarks: [
    { label: "Workspace", address: "workspace.novabyte.example/files" },
    { label: "Travel portal", address: "travel.novabyte.example" },
    { label: "Help center", address: "help.novabyte.example" },
    { label: "Directory", address: "directory.novabyte.example" },
  ],
  Surface: LoginSurface,
};
