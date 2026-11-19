"use client";

import type { Skin, SurfaceProps } from "../scene-player";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  AlertTriangleIcon, ArrowLeftIcon, BurgerMenuThreeIcon, ChevronDownIcon, DeleteDustbin01Icon, EnvelopeIcon, FlagIcon,
  FolderIcon, Icon, PencilEditIcon, PhoneIcon, RefreshIcon, SearchIcon, SendPlaneHorizontalIcon, StarIcon,
} from "../icon";
import { Avatar, InspectButton, SceneIn, destinationOf, senderParts } from "./shared";

const actionIcon = (label: string) =>
  /report/i.test(label) ? FlagIcon : /archive/i.test(label) ? FolderIcon : /verify|call/i.test(label) ? PhoneIcon : /forward/i.test(label) ? SendPlaneHorizontalIcon : null;

const isLinkAction = (label: string) => /^(open|forward)/i.test(label);

/** Inbox Trap: a webmail client in the style of the big providers. */
function MailSurface({ view, scene, site, busy, opened, open, start, inspect, act, hover }: SurfaceProps) {
  const [reading, setReading] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  const incoming = scene ? senderParts(scene.sender) : null;
  const destination = destinationOf(scene);
  const link = scene?.actions.findIndex(isLinkAction) ?? -1;
  const showScene = Boolean(scene && opened && reading === null);
  const unread = view.started && !view.complete && !opened ? 1 : 0;
  const [pointing, setPointing] = useState(false);
  // Hovering a link is how you check it: the status bar shows where it goes.
  const pointAt = (on: boolean) => {
    setPointing(on);
    if (on && scene && !scene.inspected && !busy) inspect();
  };
  useEffect(() => hover(pointing ? destination ?? "Checking link…" : null), [pointing, destination, hover]);

  const folders = [
    { label: "Inbox", icon: EnvelopeIcon, count: unread || null, active: true },
    { label: "Starred", icon: StarIcon },
    { label: "Sent", icon: SendPlaneHorizontalIcon },
    { label: "Spam", icon: AlertTriangleIcon, count: 2 },
    { label: "Trash", icon: DeleteDustbin01Icon },
  ];

  return (
    <div className="flex h-full flex-col bg-[#f6f8fc] text-[14px] text-[#1f1f1f]">
      <header className="flex h-14 shrink-0 items-center gap-3 px-3">
        <span className="flex size-10 items-center justify-center rounded-full text-[#444746]"><Icon icon={BurgerMenuThreeIcon} size={20} /></span>
        <span className="hidden w-[180px] items-center gap-2 text-[20px] text-[#444746] md:flex">
          <span className="flex size-7 items-center justify-center rounded-md bg-[#b3261e] text-[13px] font-semibold text-white">N</span>Mail
        </span>
        <label className="flex h-11 max-w-[720px] flex-1 items-center gap-3 rounded-full bg-[#e9eef6] px-4 text-[#444746]">
          <Icon icon={SearchIcon} size={18} />
          <input placeholder="Search mail" aria-label="Search mail" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#444746]" />
        </label>
        <Avatar name="Sam" size={32} className="ml-auto" />
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Mail folders" className="hidden w-[220px] shrink-0 flex-col pr-3 pl-2 2xl:flex">
          <span className="mb-3 ml-1 inline-flex h-14 w-fit items-center gap-3 rounded-2xl bg-[#c2e7ff] pr-6 pl-4 font-medium text-[#001d35]">
            <Icon icon={PencilEditIcon} size={18} />Compose
          </span>
          {folders.map(folder => (
            <span key={folder.label} className={cn("flex h-8 items-center gap-4 rounded-r-full pr-3 pl-6 text-[14px]", folder.active ? "bg-[#d3e3fd] font-semibold text-[#001d35]" : "text-[#444746]")}>
              <Icon icon={folder.icon} size={17} />{folder.label}
              {folder.count ? <span className="ml-auto text-[12px]">{folder.count}</span> : null}
            </span>
          ))}
          <p className="mt-auto mb-3 pl-6 text-[12px] text-[#5f6368]">{site.account}</p>
        </nav>

        <div className="mr-2 mb-2 ml-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white 2xl:ml-0">
          <div className="flex h-12 shrink-0 items-center gap-1 border-b border-[#f1f3f4] px-3 text-[#444746]">
            {(showScene || reading !== null) ? (
              <button type="button" onClick={() => { setReading(null); if (showScene) setReading(-1); }} aria-label="Back to inbox" className="flex size-9 items-center justify-center rounded-full hover:bg-black/5 lg:hidden">
                <Icon icon={ArrowLeftIcon} size={18} />
              </button>
            ) : null}
            <button
              type="button"
              disabled={view.started || busy}
              onClick={start}
              className={cn("flex h-9 items-center gap-2 rounded-full px-3 text-[13px] hover:bg-black/5 disabled:hover:bg-transparent", !view.started && "bg-[#0b57d0] text-white hover:bg-[#0a4ebc]")}
            >
              <Icon icon={RefreshIcon} size={16} />{view.started ? "Up to date" : site.task}
            </button>
            <span className="ml-auto text-[12px] text-[#5f6368]">1–{site.rows.length + (scene ? 1 : 0)} of {site.rows.length + (scene ? 1 : 0)}</span>
          </div>

          <div className="flex min-h-0 flex-1">
            <ul className={cn("min-h-0 overflow-y-auto lg:w-[320px] lg:shrink-0 lg:border-r lg:border-[#f1f3f4]", showScene || (reading !== null && reading >= 0) ? "hidden lg:block" : "flex-1")}>
              <AnimatePresence initial={false}>
                {scene && incoming && (
                  <motion.li key={`n${view.step}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <Row
                      from={incoming.name}
                      title={scene.subject}
                      body={scene.message}
                      when={incoming.meta.replace(/^.*?(\d)/, "$1")}
                      unread={!opened}
                      selected={showScene}
                      onClick={() => { setReading(null); setDetails(false); if (!opened) open(); }}
                    />
                  </motion.li>
                )}
              </AnimatePresence>
              {site.rows.map(([from, title, when, body], index) => (
                <li key={title}>
                  <Row from={from} title={title} body={body} when={when} selected={reading === index} onClick={() => setReading(index)} />
                </li>
              ))}
            </ul>

            <section className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", !showScene && !(reading !== null && reading >= 0) && "hidden lg:block")}>
              {showScene && scene && incoming ? (
                <SceneIn id={view.step}>
                  <div className="flex flex-wrap items-center gap-1 border-b border-[#f1f3f4] pb-3">
                    {scene.actions.map((label, index) => {
                      if (index === link) return null;
                      const icon = actionIcon(label);
                      return (
                        <button key={label} type="button" disabled={busy} onClick={() => act(index)} className={cn("flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50", /report/i.test(label) ? "text-[#b3261e] hover:bg-[#fce8e6]" : "text-[#444746] hover:bg-black/5")}>
                          {icon && <Icon icon={icon} size={16} />}{label}
                        </button>
                      );
                    })}
                  </div>
                  <h2 className="mt-4 text-[22px] leading-snug">{scene.subject}</h2>
                  <div className="mt-4 flex items-start gap-3">
                    <Avatar name={incoming.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px]"><b className="font-semibold">{incoming.name}</b></p>
                      <button type="button" onClick={() => setDetails(value => !value)} className="flex items-center gap-1 text-[12px] text-[#5f6368] hover:text-[#1f1f1f]">
                        to me <Icon icon={ChevronDownIcon} size={12} />
                      </button>
                      {details && (
                        <div className="mt-2 w-fit rounded-lg p-3 text-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                          {scene.inspected && scene.clues ? (
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                              {scene.clues.map(clue => (
                                <div key={clue.field} className="contents">
                                  <dt className="text-right text-[#5f6368]">{clue.field}:</dt>
                                  <dd className={cn("break-all", clue.tagged && "text-[#b3261e]")}>{clue.value}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <InspectButton scene={scene} onInspect={inspect} busy={busy} />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] text-[#5f6368]">{incoming.meta}</span>
                  </div>
                  {!details && <div className="mt-3 ml-[52px]"><InspectButton scene={scene} onInspect={inspect} busy={busy} /></div>}
                  <div className="mt-6 ml-[52px] max-w-[620px] text-[14px] leading-6 text-[#1f1f1f]">
                    <p>{scene.message}</p>
                    {link >= 0 && (
                      <p className="mt-5">
                        <button
                          type="button"
                          disabled={busy}
                          onMouseEnter={() => pointAt(true)}
                          onMouseLeave={() => pointAt(false)}
                          onFocus={() => pointAt(true)}
                          onBlur={() => pointAt(false)}
                          onClick={() => act(link)}
                          className="text-[#0b57d0] underline underline-offset-2 hover:text-[#0842a0]"
                        >
                          {scene.actions[link]}
                        </button>
                      </p>
                    )}
                    <p className="mt-6 text-[#5f6368]">{incoming.name}</p>
                  </div>
                </SceneIn>
              ) : reading !== null && reading >= 0 ? (
                <SceneIn id={`r${reading}`}>
                  <h2 className="text-[22px]">{site.rows[reading][1]}</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar name={site.rows[reading][0]} />
                    <p className="flex-1"><b className="font-semibold">{site.rows[reading][0]}</b></p>
                    <span className="text-[12px] text-[#5f6368]">{site.rows[reading][2]}</span>
                  </div>
                  <p className="mt-6 ml-[52px] max-w-[620px] leading-6">{site.rows[reading][3]}</p>
                </SceneIn>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-[#5f6368]">
                  <Icon icon={EnvelopeIcon} size={40} strokeWidth={1.25} />
                  <p className="mt-3 max-w-xs text-[13px]">{view.started ? "A new message arrived. Open it from the list." : site.intro}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ from, title, body, when, unread, selected, onClick }: { from: string; title: string; body: string; when: string; unread?: boolean; selected?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-start gap-3 border-b border-[#f1f3f4] px-4 py-3 text-left transition-colors", selected ? "bg-[#c2dbff]/60" : unread ? "bg-white hover:bg-[#f2f6fc]" : "bg-[#f8fafd] hover:bg-[#f2f6fc]")}>
      <Avatar name={from} size={32} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate", unread && "font-bold")}>{from}</span>
          <span className={cn("ml-auto shrink-0 text-[12px]", unread ? "font-bold" : "text-[#5f6368]")}>{when}</span>
        </span>
        <span className={cn("block truncate text-[13px]", unread && "font-bold")}>{title}</span>
        <span className="block truncate text-[13px] text-[#5f6368]">{body}</span>
      </span>
    </button>
  );
}

export const mailSkin: Skin = {
  accent: "#f472b6",
  tabTitle: view => (view.started && !view.complete ? `Inbox (1) - ${view.site.account}` : `Inbox - ${view.site.account}`),
  tabIcon: <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#b3261e] text-[9px] font-bold text-white">N</span>,
  Surface: MailSurface,
};
