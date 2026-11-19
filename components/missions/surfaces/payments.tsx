"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { ArrowDownIcon, ArrowUpIcon, ChatIcon, Icon, LockCloseIcon, PhoneIcon, QrIcon, WalletIcon } from "../icon";
import { Avatar, InspectButton, senderParts } from "./shared";

const BRAND = "#5b3cc4";

type Kind = "sms" | "request" | "call";
const kindOf = (surface: string): Kind => (/request/i.test(surface) ? "request" : /call/i.test(surface) ? "call" : "sms");

const KIND_ICON = { sms: ChatIcon, request: WalletIcon, call: PhoneIcon };

/** Refund Rush: a phone payments app where “wrong transfer” scams arrive. */
function PaymentsSurface({ view, scene, site, busy, opened, open, start, inspect, act }: SurfaceProps) {
  const still = useReducedMotion();
  const kind = scene ? kindOf(scene.surface) : null;
  const who = scene ? senderParts(scene.sender) : null;
  const showing = Boolean(scene && opened);
  const details = useRef<HTMLDivElement>(null);
  const inspected = Boolean(scene?.inspected);

  // After the check, bring the details into view inside the phone.
  useEffect(() => {
    if (inspected) details.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }, [inspected, view.step, still]);

  return (
    // The phone fills the frame: its middle scrolls and the choices stay pinned at
    // the bottom, so nothing is ever cut off, on a desktop or a small phone.
    <div className="flex h-full justify-center bg-[#eceaf3] px-2 py-2 text-[#1b1530] sm:px-3 sm:py-4">
      <div className="relative flex h-full w-full max-w-[420px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_8px_40px_rgba(27,21,48,0.12)] ring-1 ring-black/5 sm:rounded-[28px]">
        {/* App bar */}
        <header className="flex shrink-0 items-center gap-3 px-4 py-3 text-white sm:px-5 sm:pt-5 sm:pb-4" style={{ background: BRAND }}>
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-[15px] font-bold">P</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[16px] font-semibold">{site.name}</p>
            <p className="text-[12px] text-white/75">{site.account}</p>
          </div>
          <Icon icon={QrIcon} size={22} className="text-white/85" />
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {showing && scene && kind && who ? (
            <motion.div key={`open-${view.step}`} className="flex min-h-0 flex-1 flex-col" initial={still ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {kind === "call" ? (
                <div className="flex flex-col items-center bg-[#1b1530] px-6 pt-8 pb-6 text-center text-white">
                  <Avatar name={who.name} size={72} />
                  <p className="mt-3 text-[20px] font-semibold">{who.name}</p>
                  <p className="text-[13px] text-white/70">{who.meta} · on call 00:{String(42 + view.step).padStart(2, "0")}</p>
                  <p className="mt-4 text-[15px] font-semibold">{scene.subject}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 border-b border-[#ece9f5] px-5 py-3">
                  <Avatar name={who.name} size={36} />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[14px] font-semibold">{who.name}</p>
                    <p className="truncate text-[12px] text-[#6b6383]">{who.meta}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 px-4 py-4 sm:px-5">
                {kind === "sms" ? (
                  <>
                    <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#f1eff7] px-4 py-2.5 text-[14px]"><b className="block text-[12px] text-[#6b6383]">SMS</b>{scene.subject}</p>
                    <p className="max-w-[90%] rounded-2xl rounded-tl-sm bg-[#f1eff7] px-4 py-2.5 text-[14px] leading-relaxed">{scene.message}</p>
                  </>
                ) : kind === "request" ? (
                  <>
                    <p className="text-[14px] leading-relaxed text-[#3d3654]">{scene.message}</p>
                    <div className="rounded-2xl border border-[#e3dff0] p-4">
                      <p className="text-[12px] font-semibold tracking-wide text-[#6b6383] uppercase">Payment request</p>
                      <p className="mt-1 text-[15px] font-semibold">{scene.subject}</p>
                      <p className="mt-1 text-[13px] text-[#6b6383]">From {who.name} · {who.meta}</p>
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f6f4fb] px-3 py-2 text-[13px] text-[#6b6383]">
                        <Icon icon={LockCloseIcon} size={15} />Enter UPI PIN to approve
                        <span aria-hidden className="ml-auto flex gap-1.5">{[0, 1, 2, 3].map(i => <i key={i} className="size-2.5 rounded-full border border-[#b9b1d3]" />)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="rounded-2xl bg-[#f1eff7] px-4 py-3 text-[14px] leading-relaxed"><b className="block text-[12px] text-[#6b6383]">What the caller says</b>{scene.message}</p>
                )}

                <InspectButton scene={scene} onInspect={inspect} busy={busy} className="border-[#d9d3ec] text-[#5b3cc4] hover:bg-[#f6f4fb]" />
                {scene.inspected && scene.clues && (
                  <div ref={details} className="rounded-2xl border border-[#e3dff0] border-l-4 px-4 py-3 text-[13px]" style={{ borderLeftColor: BRAND }}>
                    <p className="mb-1.5 text-[12px] font-semibold text-[#6b6383]">{scene.evidence}</p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      {scene.clues.map(clue => <div key={clue.field} className="contents"><dt className="text-[#6b6383]">{clue.field}</dt><dd>{clue.value}</dd></div>)}
                    </dl>
                  </div>
                )}
              </div>

              </div>

              {/* Choices: always visible at the bottom of the phone. */}
              <div className="shrink-0 space-y-2 border-t border-[#ece9f5] bg-white px-4 py-3 shadow-[0_-6px_16px_rgba(27,21,48,0.06)] sm:px-5">
                <p className="text-[12px] text-[#6b6383]">What do you do?</p>
                {scene.actions.map((label, index) => (
                  <button key={label} type="button" disabled={busy} onClick={() => act(index)} className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d9d3ec] px-4 py-2 text-center text-[14px] font-semibold transition-colors hover:bg-[#f6f4fb] disabled:opacity-50">
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="home" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain" initial={false} exit={{ opacity: 0 }}>
              {/* Notification sliding in over the home screen. */}
              <AnimatePresence>
                {scene && kind && who && !opened && (
                  <motion.button
                    key={`n${view.step}`}
                    type="button"
                    onClick={open}
                    className="mx-3 mt-3 flex items-start gap-3 rounded-2xl bg-[#1b1530] p-3 text-left text-white shadow-lg"
                    initial={still ? false : { y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", kind === "call" ? "bg-[#30a46c]" : "bg-white/15")}>
                      <Icon icon={KIND_ICON[kind]} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{who.name}</span>
                      <span className="block truncate text-[13px] text-white/75">{scene.subject}</span>
                      <span className="mt-1.5 inline-flex h-7 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-[#1b1530]">{scene.entry ?? "Open"}</span>
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="px-5 pt-4">
                <div className="grid grid-cols-3 gap-2 text-center text-[12px] text-[#3d3654]">
                  {[["Scan", QrIcon], ["Pay", ArrowUpIcon], ["Receive", ArrowDownIcon]].map(([label, icon]) => (
                    <span key={label as string} className="flex flex-col items-center gap-1 rounded-xl bg-[#f6f4fb] py-3"><Icon icon={icon as typeof QrIcon} size={20} className="text-[#5b3cc4]" />{label as string}</span>
                  ))}
                </div>
              </div>
              <div className="flex-1 px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold tracking-wide text-[#6b6383] uppercase">Recent</p>
                <ul className="divide-y divide-[#ece9f5]">
                  {site.rows.map(([from, title, when, body]) => (
                    <li key={from + when} className="flex items-center gap-3 py-2.5">
                      <Avatar name={from} size={32} />
                      <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[14px] font-medium">{from}</span><span className="text-[12px] text-[#6b6383]">{title} · {when}</span></span>
                      <span className={cn("text-[13px] font-semibold tabular-nums", title === "Received" ? "text-[#188038]" : "text-[#1b1530]")}>{title === "Received" ? "+" : "−"}{body.split(" ")[0]} {body.split(" ")[1]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {!scene && (
                <div className="border-t border-[#ece9f5] px-5 py-4">
                  <p className="text-[13px] text-[#6b6383]">{site.intro}</p>
                  <button type="button" disabled={busy} onClick={start} className="mt-2 flex h-11 w-full items-center justify-center rounded-xl text-[14px] font-semibold text-white disabled:opacity-60" style={{ background: BRAND }}>{site.task}</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const paymentsSkin: Skin = {
  accent: "#8b6cf0",
  tabTitle: view => (view.scene ? `${view.scene.surface} - ${view.site.name}` : `Home - ${view.site.name}`),
  tabIcon: <span className="flex size-4 items-center justify-center rounded-[3px] text-[9px] font-bold text-white" style={{ background: BRAND }}>P</span>,
  Surface: PaymentsSurface,
};
