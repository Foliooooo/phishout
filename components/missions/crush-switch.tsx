"use client";

import type { Game } from "@/lib/games";
import type { ChatView } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserChrome, type ChromeTab } from "./browser-chrome";
import { Confetti, CountUp, GameFrame, LoadingStage, ProblemStage } from "./frame";
import {
  CheckTickCircleIcon, EnvelopeIcon, HeartIcon, HomeIcon, Icon, InformationCircleIcon, MinusCircleIcon,
  MultipleCrossCancelIcon, RefreshIcon, SearchIcon, SendPlaneHorizontalIcon,
} from "./icon";
import { play } from "./sfx";
import { Avatar } from "./surfaces/shared";
import { FakestaProfile, PROFILES, type FakestaHandle } from "./fakesta-profile";
import Image from "next/image";
import { useMission } from "./use-mission";

type Tab = "direct" | "mail" | "signup";
type Bubble = { id: number; text: string; mine: boolean };

const ADDRESS: Record<Tab, string> = {
  direct: "fakestagram.example/direct/inbox",
  mail: "mail.fakestagram.example/inbox",
  signup: "fakestagram-session.example/signup",
};
const LOOKALIKE = "https://fakestagram-session.example/signup";
const ACCENT = "#f72585";
const GRADIENT = "linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)";

const OPENERS: Bubble[] = [
  { id: -4, text: "i’m still thinking about that chilli oil", mine: true },
  { id: -3, text: "okay glad it wasn’t just me", mine: false },
  { id: -2, text: "hey you 👀", mine: false },
  { id: -1, text: "can you help me lock in a place and time for Saturday?", mine: false },
];

export function CrushSwitch({ game }: { game: Game }) {
  const mission = useMission<ChatView>(game.slug);
  const { view, busy, send } = mission;
  const still = useReducedMotion();
  const [tab, setTab] = useState<Tab>("direct");
  const [typed, setTyped] = useState<{ runId: string | null; lines: string[] }>({ runId: null, lines: [] });
  // Your own lines live only in this browser tab (the server never stores them),
  // keyed by run so a reload or code refresh doesn’t lose them.
  const storageKey = mission.runId ? `crush-lines:${mission.runId}` : null;
  if (mission.runId && typed.runId !== mission.runId) {
    let lines: string[] = [];
    try {
      lines = JSON.parse(sessionStorage.getItem(`crush-lines:${mission.runId}`) ?? "[]");
    } catch {
      // Storage unavailable: start empty.
    }
    setTyped({ runId: mission.runId, lines: Array.isArray(lines) ? lines.filter(line => typeof line === "string") : [] });
  }
  const mine = typed.lines;
  const setMine = (update: (list: string[]) => string[]) => setTyped(current => {
    const lines = update(current.lines);
    try {
      if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // Storage unavailable: keep them in memory only.
    }
    return { ...current, lines };
  });
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [shownReplies, setShownReplies] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [profile, setProfile] = useState<FakestaHandle | null>(null);
  const [mailOpen, setMailOpen] = useState<"session" | "pizza" | "library" | null>(null);
  const [filled, setFilled] = useState(false);
  const [debriefSeen, setDebriefSeen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const transcript = useRef<HTMLDivElement>(null);

  const replies = view?.replies ?? [];
  const visibleReplies = shownReplies ?? replies.length;
  const awaitingNotice = view && view.messages === 3 && !view.notice && !view.complete;

  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: still ? "auto" : "smooth" });
  }, [mine.length, visibleReplies, typing, confirmation, still]);

  // A few seconds after the third reply, the fake logout lands.
  useEffect(() => {
    if (!awaitingNotice) return;
    const timer = setTimeout(async () => {
      const next = await send({ kind: "notice" });
      if (next?.notice) play("alarm");
    }, still ? 300 : 2600);
    return () => clearTimeout(timer);
  }, [awaitingNotice, send, still]);

  if (mission.status === "signed-out") return <ProblemStage title="Your session ended" body="Sign in again to keep playing." href={`/sign-in?next=/games/${game.slug}/play`} action="Sign in" />;
  if (mission.status === "error") return <ProblemStage title="Mission server unreachable" body="We couldn’t save your progress. Check that MongoDB is running locally, then try again." onRetry={() => void mission.open()} />;
  if (!view) return <LoadingStage title={game.title} />;

  const composerLocked = typing || busy || view.complete || (view.notice && !view.dismissed) || (view.messages >= 3 && !view.dismissed) || (view.dismissed && view.confirmed);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || composerLocked) return;
    setDraft("");
    play("send");
    if (view.dismissed) {
      setConfirmation(text);
      const next = await send({ kind: "confirm_plan" });
      if (next?.confirmed) play("ding");
      return;
    }
    const turn = view.messages;
    setMine(list => [...list, text]);
    setShownReplies(replies.length);
    setTyping(true);
    const next = await send({ kind: "message", turn, text });
    setTimeout(() => {
      setTyping(false);
      setShownReplies(null);
      if (next && next.messages > turn) play("pop");
    }, still ? 0 : 900 + Math.random() * 700);
  };

  const openMail = async (which: "session" | "pizza" | "library") => {
    setMailOpen(which);
    if (which === "session" && !view.mailOpened) await send({ kind: "read_mail" });
  };

  const followLink = async () => {
    play("click");
    await send({ kind: "open_link" });
    setTab("signup");
  };

  const restart = async () => {
    setTab("direct");
    setDebriefSeen(false);
    setConfirmation(null);
    setFilled(false);
    setMailOpen(null);
    await mission.open(true);
  };

  const bubbles: Bubble[] = [...OPENERS];
  for (let turn = 0; turn < Math.max(view.messages, mine.length); turn += 1) {
    if (mine[turn]) bubbles.push({ id: turn * 2, text: mine[turn], mine: true });
    if (turn < visibleReplies) bubbles.push({ id: turn * 2 + 1, text: replies[turn], mine: false });
  }
  if (confirmation) bubbles.push({ id: 100, text: confirmation, mine: true });
  if (view.confirmed) bubbles.push({ id: 101, text: "yay!! booked 🎉 see you saturday", mine: false });

  const tabs: ChromeTab[] = [
    { id: "direct", title: "Direct • Fakestagram", icon: <span className="size-3.5 rounded-[4px]" style={{ background: GRADIENT }} /> },
    { id: "mail", title: view.notice ? "(1) Inbox – Mail" : "Inbox – Mail", icon: <Icon icon={EnvelopeIcon} size={14} className="text-[#c5221f]" />, alert: view.notice && !view.mailOpened },
    ...(view.linkOpened ? [{ id: "signup", title: "Sign up • Fakestagram", icon: <span className="size-3.5 rounded-[4px]" style={{ background: GRADIENT }} /> }] : []),
  ];

  return (
    <GameFrame game={game} accent={ACCENT} step={view.complete ? 3 : view.notice ? 2 : view.messages > 0 ? 1 : 0} total={3} xp={view.xp}>
      <BrowserChrome tabs={tabs} activeTab={tab} onTab={id => { play("click"); setTab(id as Tab); }} address={tab === "direct" && profile ? `fakestagram.example/${profile}` : ADDRESS[tab]} status={status}>
        {tab === "direct" && (
          <div className="relative flex h-full bg-white text-[#000]">
            <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-6 border-r border-[#dbdbdb] py-6 text-xl md:flex">
              <span className="size-7 rounded-lg" style={{ background: GRADIENT }} />
              <Icon icon={HomeIcon} size={24} /><Icon icon={SearchIcon} size={24} /><Icon icon={SendPlaneHorizontalIcon} size={24} strokeWidth={2.25} /><Icon icon={HeartIcon} size={24} />
              <button type="button" onClick={() => setProfile("sam.jpg")} aria-label="Your profile" className="relative mt-auto size-7 overflow-hidden rounded-full ring-1 ring-[#dbdbdb]">
                <Image src={PROFILES["sam.jpg"].avatar} alt="" fill sizes="28px" className="object-cover" />
              </button>
            </aside>
            <aside className="hidden w-80 shrink-0 flex-col border-r border-[#dbdbdb] lg:flex">
              <p className="px-6 pt-6 pb-3 text-xl font-bold">sam.jpg ⌄</p>
              <p className="px-6 pb-2 font-bold">Messages</p>
              {[["Riley", bubbles.at(-1)?.text ?? "", true], ["Pizza people", "Alex: same time? · 2h", false], ["Jordan", "Sent you a reel · 1d", false]].map(([name, preview, active]) => (
                <div key={String(name)} className={cn("flex items-center gap-3 px-6 py-2", active && !profile && "bg-[#efefef]")}>
                  <button
                    type="button"
                    disabled={name === "Pizza people"}
                    onClick={() => setProfile(name === "Riley" ? "riley.afterhours" : "jordan.walks")}
                    aria-label={name === "Pizza people" ? undefined : `View ${name}’s profile`}
                    className="flex size-12 shrink-0 items-center justify-center rounded-full p-[2px] enabled:hover:opacity-90"
                    style={{ background: GRADIENT }}
                  ><Avatar name={String(name)} size={44} className="ring-2 ring-white" /></button>
                  <span className="min-w-0 text-sm"><b className="block">{name}</b><span className="block truncate text-[#737373]">{preview}</span></span>
                </div>
              ))}
            </aside>
            {profile && (
              <section className="min-w-0 flex-1">
                <FakestaProfile handle={profile} onBack={() => setProfile(null)} onMessage={profile === "riley.afterhours" ? () => setProfile(null) : undefined} />
              </section>
            )}
            <section className={cn("flex min-w-0 flex-1 flex-col", profile && "hidden")}>
              <header className="flex items-center gap-3 border-b border-[#dbdbdb] px-4 py-3">
                <button type="button" onClick={() => setProfile("riley.afterhours")} aria-label="View Riley’s profile" className="flex items-center gap-3 rounded-lg text-left hover:opacity-80">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full p-[2px]" style={{ background: GRADIENT }}><Avatar name="Riley" size={36} className="ring-2 ring-white" /></span>
                  <span><b className="block text-sm">Riley</b><span className="text-xs text-[#737373]">riley.afterhours · Active now</span></span>
                </button>
                <button type="button" onClick={() => setDetails(true)} className="ml-auto flex size-9 items-center justify-center rounded-full hover:bg-[#efefef]" aria-label="Show profile and session details"><Icon icon={InformationCircleIcon} size={22} /></button>
              </header>
              <div ref={transcript} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4" role="log" aria-label="Conversation with Riley">
                <p className="pb-2 text-center text-xs text-[#737373]">Today</p>
                <AnimatePresence initial={false}>
                  {bubbles.map(bubble => (
                    <motion.p
                      key={bubble.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn("w-fit max-w-[75%] rounded-[22px] px-4 py-2 text-[15px]", bubble.mine ? "ml-auto text-white" : "bg-[#efefef]")}
                      style={bubble.mine ? { background: "linear-gradient(135deg,#a033ff,#ff5c87)" } : undefined}
                    >
                      {bubble.text}
                    </motion.p>
                  ))}
                </AnimatePresence>
                {typing && (
                  <p className="flex w-fit gap-1 rounded-[22px] bg-[#efefef] px-4 py-3" aria-label="Riley is typing">
                    {[0, 1, 2].map(dot => <motion.i key={dot} className="size-2 rounded-full bg-[#8e8e8e]" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: dot * 0.15 }} />)}
                  </p>
                )}
              </div>
              <form onSubmit={sendMessage} className="m-3 flex items-center gap-2 rounded-full border border-[#dbdbdb] px-4 py-2">
                <Icon icon={HeartIcon} size={20} className="text-[#737373]" />
                <input
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  disabled={composerLocked}
                  maxLength={180}
                  autoFocus
                  aria-label="Message Riley"
                  placeholder={view.dismissed && !view.confirmed ? "Confirm the plan with Riley…" : view.messages >= 3 ? "Message…" : "Message… (say anything)"}
                  className="min-w-0 flex-1 bg-transparent py-1 outline-none disabled:opacity-50"
                />
                <button type="submit" disabled={composerLocked || !draft.trim()} className="font-bold text-[#0095f6] disabled:opacity-40">Send</button>
              </form>
            </section>

            <AnimatePresence>
              {view.notice && !view.dismissed && !view.complete && (
                <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div role="dialog" aria-labelledby="logout-title" className="relative w-full max-w-sm rounded-xl bg-white p-8 text-center" initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <button type="button" aria-label="Dismiss session overlay" disabled={busy} onClick={() => { play("click"); void send({ kind: "dismiss" }); }} className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full text-[#737373] hover:bg-black/5 hover:text-black"><Icon icon={MultipleCrossCancelIcon} size={16} /></button>
                    <p className="font-serif text-3xl italic">Fakestagram</p>
                    <h2 id="logout-title" className="mt-5 text-lg font-bold">Session expired</h2>
                    <p className="mt-2 text-sm text-[#737373]">We couldn’t refresh your session. Check your inbox to get back to Direct.</p>
                    <button type="button" onClick={() => { play("click"); setTab("mail"); }} className="mt-6 w-full rounded-lg bg-[#0095f6] py-2.5 font-bold text-white">Check your email</button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {details && (
                <motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div role="dialog" aria-labelledby="session-title" className="w-full max-w-sm rounded-xl bg-white p-6" initial={{ y: 20 }} animate={{ y: 0 }}>
                    <h2 id="session-title" className="text-lg font-bold">Account session</h2>
                    <p className="mt-2 text-sm">Signed in as <b>sam.jpg</b> on this device since this morning. Your conversation is still here.</p>
                    {view.notice && (
                      <button type="button" disabled={busy || !view.dismissed || !view.mailOpened} onClick={() => { setDetails(false); void send({ kind: "report" }); }} className="mt-5 w-full rounded-lg bg-[#0095f6] py-2.5 font-bold text-white disabled:opacity-40">
                        Report the suspicious email
                      </button>
                    )}
                    {view.notice && !view.mailOpened && <p className="mt-2 text-xs text-[#737373]">Open the email first so you know what you’re reporting.</p>}
                    <button type="button" onClick={() => setDetails(false)} className="mt-2 w-full rounded-lg py-2.5 font-bold">Done</button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {tab === "mail" && (
          <div className="flex h-full bg-[#f6f8fc] text-[#202124]">
            <aside className="hidden w-48 shrink-0 p-4 text-sm sm:block"><p className="flex items-center gap-2 text-lg font-semibold"><Icon icon={EnvelopeIcon} size={18} className="text-[#c5221f]" />Mail</p><p className="mt-4 rounded-full bg-[#d3e3fd] px-4 py-1.5 font-bold">Inbox {view.notice && !view.mailOpened ? "1" : ""}</p><p className="mt-6 text-xs text-[#5f6368]">sam@fakestagram.example</p></aside>
            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white sm:flex-row">
              <ul className="sm:w-72 sm:shrink-0 sm:border-r sm:border-black/5">
                {view.notice && (
                  <li><button type="button" onClick={() => void openMail("session")} className={cn("w-full border-b border-black/5 px-4 py-3 text-left text-sm", !view.mailOpened && "bg-[#eef3ff] font-bold")}><span className="flex">Fakestagram<span className="ml-auto text-xs">Just now</span></span>Your Direct session</button></li>
                )}
                {([["pizza", "South Street Pizza", "Receipt for Saturday", "Yesterday"], ["library", "Maple Library", "Your hold is ready", "Monday"]] as const).map(([key, from, subject, when]) => (
                  <li key={key}><button type="button" onClick={() => void openMail(key)} className="w-full border-b border-black/5 px-4 py-3 text-left text-sm"><span className="flex">{from}<span className="ml-auto text-xs text-[#5f6368]">{when}</span></span>{subject}</button></li>
                ))}
              </ul>
              <article className="min-h-0 flex-1 overflow-y-auto p-6">
                {mailOpen === "session" ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl">Your Direct session</h2>
                    <p className="mt-3 text-sm"><b>Fakestagram</b> <span className="text-[#5f6368]">&lt;accounts@fakestagram-session.example&gt;</span></p>
                    <p className="mt-5 max-w-lg leading-7">Hi Sam, we paused your Direct session when we couldn’t confirm your account. You can get back to your messages below.</p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button type="button" disabled={busy} onMouseEnter={() => setStatus(LOOKALIKE)} onMouseLeave={() => setStatus(null)} onFocus={() => setStatus(LOOKALIKE)} onBlur={() => setStatus(null)} onClick={() => void followLink()} className="h-9 rounded-lg bg-[#0095f6] px-5 text-[14px] font-semibold text-white hover:bg-[#1877f2]">Return to Direct</button>
                      <button type="button" disabled={busy || view.inspected} onClick={() => { play("reveal"); void send({ kind: "inspect_link" }); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#dadce0] px-3 text-[13px] font-medium text-[#1a73e8] hover:bg-[#f6fafe] disabled:text-[#188038]"><Icon icon={view.inspected ? CheckTickCircleIcon : SearchIcon} size={14} />{view.inspected ? "Link checked" : "Inspect link"}</button>
                    </div>
                    {view.inspected && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 max-w-lg rounded-md border-l-4 border-[#c5221f] bg-[#fce8e6] px-3 py-2 text-[13px] text-[#5f2120]">Goes to <span className="font-mono">fakestagram-session.example/signup</span>. That isn’t fakestagram.example: it’s a different domain using the same logo.</motion.p>}
                  </motion.div>
                ) : mailOpen ? (
                  <div><h2 className="text-2xl">{mailOpen === "pizza" ? "Receipt for Saturday" : "Your hold is ready"}</h2><p className="mt-4 leading-7">{mailOpen === "pizza" ? "Thanks for your order! Table for 4 at 7:30 PM." : "Your book is waiting at the front desk until Friday."}</p></div>
                ) : (
                  <p className="text-[#5f6368]">{view.notice ? "Select a message." : "Nothing new. Your inbox is quiet."}</p>
                )}
              </article>
            </div>
          </div>
        )}

        {tab === "signup" && (
          <div className="flex h-full items-center justify-center bg-[#fafafa] p-4 text-black">
            <div className="w-full max-w-sm rounded-sm border border-[#dbdbdb] bg-white p-10 text-center">
              <p className="font-serif text-4xl italic">Fakestagram</p>
              <h2 className="mt-4 font-bold text-[#737373]">Finish signing up to get back to the people and conversations you love.</h2>
              <div className="mt-6 space-y-2 text-left text-sm">
                <input readOnly value={filled ? "sam.practice" : ""} placeholder="Username" aria-label="Username" className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5" />
                <input readOnly type="password" value={filled ? "practice-only" : ""} placeholder="Password" aria-label="Password" className="w-full rounded-sm border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5" />
              </div>
              <button type="button" onClick={() => setFilled(true)} className="mt-3 text-sm font-bold text-[#00376b]">Use practice details</button>
              <button type="button" disabled={!filled || busy || view.complete} onClick={() => void send({ kind: "submit_demo" })} className="mt-3 w-full rounded-lg bg-[#0095f6] py-2 font-bold text-white disabled:opacity-40">Sign up</button>
              <p className="mt-4 text-xs text-[#737373]">Sandbox demo fields. Real credentials can’t be entered.</p>
            </div>
          </div>
        )}
      </BrowserChrome>

      <AnimatePresence>
        {view.complete && !debriefSeen && (
          <motion.div className="absolute inset-0 z-50 overflow-y-auto bg-[#0f0f12] p-4 text-zinc-100 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {view.correct && <Confetti accent={ACCENT} />}
            <section role="dialog" aria-modal="true" aria-labelledby="crush-debrief" className="mx-auto max-w-2xl py-4">
              <p className="text-[13px] text-zinc-500">Mission complete · Crush Switch{view.ranked ? "" : " · rewound replay, unranked"}</p>
              <h2 id="crush-debrief" className="mt-2 text-[28px] font-semibold tracking-tight">{view.correct ? "You spotted the fake logout." : "You took the bait."}</h2>
              <p className="mt-1 text-[15px] text-zinc-400">{view.correct ? "You checked the original tab and reported the email." : "The lookalike received the practice details. With a real password, this could have exposed your account."}</p>
              <p className="mt-6 text-[44px] font-semibold tracking-tight tabular-nums"><CountUp value={view.xp} duration={1.2} /><span className="ml-1 text-[20px] font-medium text-zinc-500">/ 100 XP</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div className="h-full rounded-full" style={{ background: ACCENT }} initial={{ width: 0 }} animate={{ width: `${view.xp}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
              </div>
              <ul className="mt-6 divide-y divide-white/[0.06] rounded-lg ring-1 ring-white/[0.08]">
                {view.breakdown.map(item => (
                  <li key={item.label} className="flex items-center gap-3 px-4 py-3 text-[14px]">
                    <Icon icon={item.points ? CheckTickCircleIcon : MinusCircleIcon} size={17} className={cn(item.points ? "text-[#3dd68c]" : "text-zinc-600")} />
                    <span className={cn(!item.points && "text-zinc-500")}>{item.label}</span>
                    <span className="ml-auto text-[13px] text-zinc-400 tabular-nums">+{item.points}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[14px] leading-relaxed text-zinc-400">
                The original tab never signed you out. The overlay only changed what the page showed, and the email linked to <span className="text-zinc-100">fakestagram-session.example</span>, a different domain using the same brand. If a notice says you’re signed out, go back to the original tab or a saved bookmark and compare the link’s domain before entering anything.
              </p>
              <h3 className="mt-6 text-[13px] font-medium text-zinc-400">Your path</h3>
              <ol className="mt-2 space-y-1.5 text-[13px] text-zinc-300">{view.timeline.map((step, index) => <li key={step} className="flex gap-3"><span className="w-4 text-zinc-600 tabular-nums">{index + 1}.</span>{step}</li>)}</ol>
              <div className="mt-8 flex flex-wrap gap-2">
                <button type="button" onClick={() => void restart()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200"><Icon icon={RefreshIcon} size={15} />Play again</button>
                {view.correct === false && <button type="button" onClick={() => void send({ kind: "rewind" }).then(() => setTab("direct"))} className="inline-flex h-10 items-center rounded-lg px-4 text-[14px] font-medium ring-1 ring-white/15 hover:bg-white/[0.06]">Rewind to the notice</button>}
                <button type="button" onClick={() => setDebriefSeen(true)} className="inline-flex h-10 items-center rounded-lg px-4 text-[14px] font-medium ring-1 ring-white/15 hover:bg-white/[0.06]">Look around</button>
                <Link href="/scores" className="inline-flex h-10 items-center rounded-lg px-4 text-[14px] font-medium ring-1 ring-white/15 hover:bg-white/[0.06]">My scores</Link>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </GameFrame>
  );
}
