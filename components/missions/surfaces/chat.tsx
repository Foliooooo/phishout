"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { ChatIcon, ChevronDownIcon, Icon, MicOnIcon, PlayCircleIcon, PlusCircleIcon, SendPlaneHorizontalIcon, UserCircleIcon } from "../icon";
import { play } from "../sfx";
import { Avatar, InspectButton, senderParts } from "./shared";

const CHANNELS = ["general", "finance-queue", "shipments"];

/** Who’s the Boss?: a team chat where authority, pressure and money meet. */
function ChatSurface({ view, scene, site, busy, opened, open, start, inspect, act }: SurfaceProps) {
  const [typing, setTyping] = useState(true);
  const [step, setStep] = useState(view.step);
  const still = useReducedMotion();
  if (step !== view.step) {
    setStep(view.step);
    setTyping(true);
  }
  useEffect(() => {
    if (!scene) return;
    const timer = setTimeout(() => {
      setTyping(false);
      play("pop");
    }, still ? 0 : 1300);
    return () => clearTimeout(timer);
  }, [scene, view.step, still]);

  const who = scene ? senderParts(scene.sender) : null;
  const voice = Boolean(scene?.entry && /voice/i.test(scene.entry));
  const ready = scene && !typing && (!voice || opened);

  return (
    <div className="flex h-full bg-white text-[15px] text-[#1d1c1d]">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#3f0e40] text-[14px] text-[#cfc3cf] sm:flex">
        <button type="button" className="flex h-12 items-center gap-1 border-b border-white/10 px-4 text-[16px] font-bold text-white">{site.name}<Icon icon={ChevronDownIcon} size={14} /></button>
        <div className="flex-1 overflow-y-auto py-3">
          <p className="px-4 pb-1 text-[13px]">Channels</p>
          {CHANNELS.map(channel => (
            <span key={channel} className={cn("mx-2 flex h-7 items-center gap-2 rounded-md px-2", !scene && channel === "finance-queue" && "bg-[#1164a3] text-white")}>
              <span className="w-3 text-center opacity-70">#</span>{channel}
            </span>
          ))}
          <p className="mt-4 px-4 pb-1 text-[13px]">Direct messages</p>
          <span className={cn("mx-2 flex h-7 items-center gap-2 rounded-md px-2", scene && "bg-[#1164a3] text-white")}>
            <span className="relative"><Avatar name={who?.name ?? "Avery"} size={20} className="rounded-[4px]" /><i className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[#2bac76] ring-2 ring-[#3f0e40]" /></span>
            {who?.name ?? "Avery"}
            {scene && !opened && voice && <span className="ml-auto rounded-full bg-[#cd2553] px-1.5 text-[11px] font-bold text-white">1</span>}
          </span>
          <span className="mx-2 flex h-7 items-center gap-2 rounded-md px-2"><Avatar name="Mira" size={20} className="rounded-[4px]" />Mira</span>
        </div>
        <p className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-[12px]"><Icon icon={UserCircleIcon} size={16} />{site.account}</p>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#e8e8e8] px-5">
          {scene && who ? (
            <><Avatar name={who.name} size={24} className="rounded-[4px]" /><b className="font-bold">{who.name}</b><span className="truncate text-[13px] text-[#616061]">{who.meta}</span></>
          ) : (
            <b className="font-bold"># finance-queue</b>
          )}
          {scene && <InspectButton scene={scene} onInspect={inspect} busy={busy} className="ml-auto h-7" doneClassName="ml-auto" />}
        </header>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 py-4">
          {site.rows.map(([from, title, when, body]) => (
            <Message key={title} name={from} when={when}><b className="font-semibold">{title}</b> — {body}</Message>
          ))}
          {!scene && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#e8e8e8] p-3 text-[14px]">
              <Icon icon={ChatIcon} size={18} className="text-[#616061]" />
              <span className="flex-1">{site.intro}</span>
              <button type="button" disabled={busy} onClick={start} className="h-8 rounded-md bg-[#007a5a] px-3 text-[13px] font-bold text-white hover:bg-[#148567]">{site.task}</button>
            </div>
          )}
          {scene && who && (
            <>
              <p className="flex items-center gap-3 py-3 text-[12px] font-bold text-[#616061]"><span className="h-px flex-1 bg-[#e8e8e8]" />Today<span className="h-px flex-1 bg-[#e8e8e8]" /></p>
              <AnimatePresence mode="wait">
                {typing ? (
                  <motion.p key="typing" className="px-2 text-[13px] text-[#616061]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <b className="font-semibold">{who.name}</b> is typing…
                  </motion.p>
                ) : (
                  <motion.div key={`m${view.step}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Message name={who.name} when="now">
                      <b className="block font-semibold">{scene.subject}</b>
                      {voice && !opened ? (
                        <button type="button" onClick={open} className="mt-2 flex items-center gap-3 rounded-lg border border-[#e8e8e8] py-2 pr-4 pl-2 hover:bg-[#f8f8f8]">
                          <Icon icon={PlayCircleIcon} size={28} className="text-[#1264a3]" strokeWidth={1.5} />
                          <span aria-hidden className="flex h-6 items-center gap-[3px]">{Array.from({ length: 32 }, (_, i) => <i key={i} className="w-[3px] rounded-full bg-[#1d1c1d]/40" style={{ height: `${25 + ((i * 37) % 75)}%` }} />)}</span>
                          <span className="text-[12px] text-[#616061] tabular-nums">0:14</span>
                        </button>
                      ) : (
                        <span className="mt-0.5 block">
                          {voice && <span className="mb-1 flex items-center gap-1 text-[12px] text-[#616061]"><Icon icon={MicOnIcon} size={13} />Voice message transcript</span>}
                          {scene.message}
                        </span>
                      )}
                    </Message>
                    {scene.inspected && scene.clues && (
                      <div className="mt-2 ml-12 max-w-md rounded-lg border border-[#e8e8e8] border-l-4 border-l-[#1264a3] px-3 py-2 text-[13px]">
                        <p className="mb-1 text-[12px] font-bold text-[#616061]">Records you checked</p>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                          {scene.clues.map(clue => <div key={clue.field} className="contents"><dt className="text-[#616061]">{clue.field}</dt><dd>{clue.value}</dd></div>)}
                        </dl>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="shrink-0 px-5 pb-4">
          {ready ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-[#bbbabb] p-3">
              <p className="text-[12px] text-[#616061]">Choose what to do</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {scene.actions.map((label, index) => (
                  <button key={label} type="button" disabled={busy} onClick={() => act(index)} className="h-8 rounded-md border border-[#bbbabb] bg-white px-3 text-[13px] font-bold transition-colors hover:bg-[#f8f8f8] disabled:opacity-50">
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex h-11 items-center gap-2 rounded-lg border border-[#bbbabb] px-3 text-[14px] text-[#868686]">
              <Icon icon={PlusCircleIcon} size={18} />
              <span className="flex-1">Message {scene && who ? who.name : "#finance-queue"}</span>
              <Icon icon={SendPlaneHorizontalIcon} size={16} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Message({ name, when, children }: { name: string; when: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-md px-2 py-1.5 hover:bg-[#f8f8f8]">
      <Avatar name={name} size={36} className="rounded-md" />
      <div className="min-w-0 leading-snug">
        <p><b className="font-bold">{name}</b> <span className="text-[12px] text-[#616061]">{when}</span></p>
        <div className="text-[15px]">{children}</div>
      </div>
    </div>
  );
}

export const chatSkin: Skin = {
  accent: "#2bac76",
  tabTitle: view => (view.scene ? `${senderParts(view.scene.sender).name} (DM) - ${view.site.name}` : `finance-queue - ${view.site.name}`),
  tabIcon: <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#3f0e40] text-[9px] font-bold text-white">N</span>,
  Surface: ChatSurface,
};
