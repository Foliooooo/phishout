"use client";

import { games, learningFor, type Game } from "@/lib/games";
import { Lumi } from "@/components/lumi";
import type { MissionReport, MissionSite, PublicScene, ReviewItem, SceneMissionView } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { ArcadeBar, ArcadeLineView, BossIntro } from "./arcade";
import { BrowserChrome, splitHost, type ChromeTab } from "./browser-chrome";
import { CoachPanel, CoachReport } from "./coach";
import { Confetti, CountUp, GameFrame, LoadingStage, ProblemStage } from "./frame";
import {
  AlertTriangleIcon, BulbOnIcon, CheckTickCircleIcon, CheckTickSquareIcon, FlagIcon, Icon, InformationCircleIcon,
  LockCloseIcon, MinusCircleIcon, MultipleCrossCancelCircleIcon, MultipleCrossCancelIcon, RefreshIcon, ShieldCheckIcon,
} from "./icon";
import { play } from "./sfx";
import { useMission } from "./use-mission";

export type SurfaceProps = {
  view: SceneMissionView;
  scene: PublicScene | null;
  site: MissionSite;
  busy: boolean;
  /** The scene's entry (e.g. "Open message") has been used. */
  opened: boolean;
  open: () => void;
  start: () => void;
  inspect: () => void;
  act: (action: number) => void;
  tag: (clue: number) => void;
  hover: (url: string | null) => void;
  navigate: (address: string | null) => void;
};

export type Skin = {
  /** Highlight colour for this game’s progress and score. */
  accent: string;
  tabTitle: (view: SceneMissionView) => string;
  tabIcon?: ReactNode;
  bookmarks?: { label: string; address: string }[];
  Surface: ComponentType<SurfaceProps>;
};

export function ScenePlayer({ game, skin }: { game: Game; skin: Skin }) {
  const mission = useMission<SceneMissionView>(game.slug);
  const { view, busy, send } = mission;
  const [briefed, setBriefed] = useState(false);
  const [seen, setSeen] = useState<number | null>(null);
  const [openedStep, setOpenedStep] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [override, setOverride] = useState<{ step: number; address: string } | null>(null);
  const [boardOpen, setBoardOpen] = useState(true);
  const [siteInfo, setSiteInfo] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [bossSeen, setBossSeen] = useState(false);

  // Resuming a run mid-way should not replay feedback that was already seen.
  const acknowledged = seen ?? view?.step ?? 0;
  const step = view?.step ?? 0;
  const scene = view?.scene ?? null;
  const feedback = view && view.step > acknowledged ? view.feedback : null;
  const showDebrief = Boolean(view?.complete && !feedback);
  const arcade = view?.arcade;
  const bossIntro = Boolean(view?.started && !view.complete && !feedback && arcade?.boss && !bossSeen);

  // Start the situation’s clock once the player can actually see it (not under feedback or the boss intro).
  const clockStopped = Boolean(view?.started && !view.complete && !feedback && !bossIntro && arcade && arcade.elapsed === null);
  useEffect(() => {
    if (clockStopped && view) void send({ kind: "begin", stage: view.step });
  }, [clockStopped, send, view]);

  const start = useCallback(() => {
    if (!view) return;
    play("ding");
    void send({ kind: "start", stage: view.step });
  }, [send, view]);

  const inspect = useCallback(() => {
    if (!view) return;
    play("reveal");
    setBoardOpen(true);
    void send({ kind: "inspect", stage: view.step });
  }, [send, view]);

  const tag = useCallback((clue: number) => {
    if (!view?.scene?.clues) return;
    const tagged = !view.scene.clues[clue].tagged;
    play(tagged ? "tag" : "untag");
    void send({ kind: "tag", stage: view.step, clue, tagged });
  }, [send, view]);

  const act = useCallback(async (action: number) => {
    if (!view) return;
    setSeen(view.step);
    setSiteInfo(false);
    const next = await send({ kind: "act", stage: view.step, action });
    if (next?.feedback) play(next.feedback.correct ? "good" : "bad");
  }, [send, view]);

  const navigate = useCallback((address: string | null) => {
    setOverride(address ? { step, address } : null);
  }, [step]);

  const continueOn = () => {
    play("click");
    setSeen(step);
    setStatus(null);
    setOverride(null);
    if (view?.complete) play("win");
  };

  const restart = async () => {
    setSeen(null);
    setBossSeen(false);
    setOpenedStep(null);
    setOverride(null);
    await mission.open(true);
  };

  if (mission.status === "signed-out") return <ProblemStage title="Your session ended" body="Sign in again to keep playing. Your progress is saved." href={`/sign-in?next=/games/${game.slug}/play`} action="Sign in" />;
  if (mission.status === "error") return <ProblemStage title={game.slug === "endless" ? "Couldn’t start Endless mode" : "Can’t reach the mission server"} body={mission.error && mission.error !== "Request failed" ? mission.error : "Your progress couldn’t be saved. Check that MongoDB is running locally, then try again."} onRetry={() => void mission.open()} />;
  if (!view) return <LoadingStage title={game.slug === "endless" ? "a new mission written by AI. This takes about 15 seconds" : game.title} />;

  const address = override?.step === step ? override.address : view.started ? scene?.address ?? view.site.address : view.site.address;
  const secure = !/^free-movies\./.test(address);
  const tabs: ChromeTab[] = [{ id: "main", title: skin.tabTitle(view), icon: skin.tabIcon }];
  const Surface = skin.Surface;
  const clues = scene?.clues ?? null;
  const boardVisible = Boolean(clues && boardOpen && scene);

  return (
    <GameFrame
      game={game}
      accent={skin.accent}
      step={view.complete ? view.total : step}
      total={view.total}
      xp={view.xp}
      onEvidence={clues ? () => setBoardOpen(open => !open) : undefined}
      evidenceOpen={boardVisible}
      onCoach={view.started && !view.complete ? () => setCoachOpen(open => !open) : undefined}
      coachOpen={coachOpen}
      evidenceCount={clues?.filter(clue => clue.tagged).length}
    >
      <div className="flex h-full min-h-0 flex-col">
      {view.started && !view.complete && <ArcadeBar arcade={view.arcade} step={step} accent={skin.accent} />}
      <div className="flex min-h-0 flex-1 gap-3">
        <BrowserChrome
          className="min-w-0 flex-1"
          tabs={tabs}
          activeTab="main"
          address={address}
          secure={secure}
          bookmarks={skin.bookmarks}
          onBookmark={bookmark => navigate(bookmark)}
          status={status}
          onSiteInfo={() => setSiteInfo(open => !open)}
          overlay={<AnimatePresence>{siteInfo && <SiteInfo address={address} secure={secure} onClose={() => setSiteInfo(false)} />}</AnimatePresence>}
        >
          <Surface
            view={view}
            scene={scene}
            site={view.site}
            busy={busy}
            opened={openedStep === step || !scene?.entry}
            open={() => {
              play("pop");
              setOpenedStep(step);
            }}
            start={start}
            inspect={inspect}
            act={act}
            tag={tag}
            hover={setStatus}
            navigate={navigate}
          />
        </BrowserChrome>

        <AnimatePresence initial={false}>
          {boardVisible && scene && (
            <EvidencePanel key={step} scene={scene} busy={busy} onTag={tag} onClose={() => setBoardOpen(false)} />
          )}
        </AnimatePresence>
      </div>
      </div>

      <AnimatePresence>
        {bossIntro && <BossIntro onGo={() => { play("alarm"); setBossSeen(true); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {coachOpen && view.started && !view.complete && !feedback && <CoachPanel step={step} ask={mission.coach} onClose={() => setCoachOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {!briefed && !view.started && step === 0 && (
          <Briefing game={game} accent={skin.accent} site={view.site} onGo={() => { play("click"); setBriefed(true); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {feedback && (
          <Feedback key={`f${step}`} item={feedback} last={view.complete} onNext={continueOn}>
            {view.arcade.lines[step - 1] && <ArcadeLineView line={view.arcade.lines[step - 1]} lives={view.arcade.lives} livesMax={view.arcade.livesMax} correct={feedback.correct} />}
          </Feedback>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDebrief && view.review && (
          <Debrief game={game} accent={skin.accent} review={view.review} xp={view.xp} arcade={view.arcade} saved={mission.saved} onReplay={() => void restart()} loadReport={mission.report} />
        )}
      </AnimatePresence>
    </GameFrame>
  );
}

function SiteInfo({ address, secure, onClose }: { address: string; secure: boolean; onClose: () => void }) {
  const { prefix, registrable, path } = splitHost(address);
  return (
    <motion.div
      role="dialog"
      aria-label="Site information"
      className="absolute top-1 left-2 z-40 w-[min(340px,calc(100%-1rem))] rounded-lg bg-white p-4 text-[#202124] shadow-[0_4px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/10"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.14 }}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[15px] font-medium break-all">{prefix}<b className="font-semibold">{registrable}</b></p>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 flex size-7 items-center justify-center rounded-full text-[#5f6368] hover:bg-black/5">
          <Icon icon={MultipleCrossCancelIcon} size={14} />
        </button>
      </div>
      <p className="mt-0.5 text-[12px] break-all text-[#5f6368]">https://{prefix}{registrable}{path}</p>
      <div className="mt-3 flex items-center gap-3 border-t border-[#e8eaed] pt-3 text-[13px]">
        <Icon icon={secure ? LockCloseIcon : AlertTriangleIcon} size={16} className={cn(secure ? "text-[#5f6368]" : "text-[#c5221f]")} />
        <span>{secure ? "Connection is secure" : "Your connection to this site is not secure"}</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[#5f6368]">
        The site that owns this page is <b className="text-[#202124]">{registrable}</b>. A padlock only means the connection is encrypted, not that the site is who it claims to be.
      </p>
    </motion.div>
  );
}

const modalBackdrop = "absolute inset-0 z-50 flex overflow-y-auto bg-black/55 p-4 backdrop-blur-[2px]";
const primaryButton = "inline-flex h-10 w-full items-center justify-center rounded-lg bg-white text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200";

function Briefing({ game, site, accent, onGo }: { game: Game; site: MissionSite; accent: string; onGo: () => void }) {
  const still = useReducedMotion();
  return (
    <motion.div className={modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="brief-title"
        className="m-auto w-full max-w-[480px] rounded-xl bg-[#18181b] text-zinc-100 ring-1 ring-white/10"
        initial={still ? false : { y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="p-6">
          <p className="flex items-center gap-2 text-[12px] font-medium text-zinc-400">
            <span className="size-1.5 rounded-full" style={{ background: accent }} />
            Mission briefing · {game.skill}
          </p>
          <h1 id="brief-title" className="mt-2 text-[22px] font-semibold tracking-tight">{game.title}</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{site.intro} {game.objective}</p>
          {learningFor(game.slug) && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
              <div className="w-16 shrink-0"><Lumi label="Lumi the angler fish" /></div>
              <p className="text-[13px] leading-relaxed text-zinc-300"><span className="font-semibold text-white">Lumi’s tip:</span> {learningFor(game.slug)!.takeaways[0]}</p>
            </div>
          )}
          <ol className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {game.instructions.map((line, index) => (
              <li key={line} className="flex gap-3 py-2.5 text-[13px] leading-relaxed text-zinc-300">
                <span className="mt-px w-4 shrink-0 text-zinc-500 tabular-nums">{index + 1}.</span>
                {line}
              </li>
            ))}
          </ol>
          {learningFor(game.slug) && (
            <div className="mt-5">
              <p className="text-[12px] font-medium text-zinc-500">You’ll practise</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {learningFor(game.slug)!.skills.map(skill => <li key={skill} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[12px] text-zinc-200">{skill}</li>)}
              </ul>
              <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{learningFor(game.slug)!.realWorld}</p>
            </div>
          )}
          <ul className="mt-5 flex flex-wrap gap-1.5 text-[12px]" aria-label="Arcade rules">
            {["2 lives", "Combos up to 3×", "Time bonus", "Boss round last, 2× points", "Shuffled every run"].map(rule => (
              <li key={rule} className="rounded-md bg-[#f5a524]/10 px-2 py-0.5 font-medium text-[#f5a524]">{rule}</li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-3 text-[12px]">
            {[["Decisions", "up to 75 XP"], ["Evidence", "up to 25 XP"], ["False flags", "cost evidence XP"]].map(([term, detail]) => (
              <div key={term} className="border-l border-white/[0.08] pl-3 first:border-l-0 first:pl-0">
                <dt className="text-zinc-500">{term}</dt>
                <dd className="mt-0.5 font-medium text-zinc-200">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border-t border-white/[0.06] p-4">
          <button type="button" autoFocus onClick={onGo} className={primaryButton}>Open {site.name}</button>
        </div>
      </motion.section>
    </motion.div>
  );
}

function EvidencePanel({ scene, busy, onTag, onClose }: { scene: PublicScene; busy: boolean; onTag: (clue: number) => void; onClose: () => void }) {
  const clues = scene.clues ?? [];
  const flagged = clues.filter(clue => clue.tagged).length;
  return (
    <motion.aside
      aria-label="Evidence"
      className="absolute inset-x-2 bottom-2 z-30 flex max-h-[55%] flex-col overflow-hidden rounded-[10px] bg-[#18181b] ring-1 ring-white/10 lg:static lg:inset-auto lg:max-h-none lg:w-[320px] lg:shrink-0"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <Icon icon={FlagIcon} size={15} className="text-zinc-400" />
        <h2 className="text-[13px] font-semibold">Evidence</h2>
        <span className="text-[12px] text-zinc-500 tabular-nums">{flagged} of {clues.length} flagged</span>
        <button type="button" onClick={onClose} aria-label="Hide evidence" className="ml-auto flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.08] hover:text-white">
          <Icon icon={MultipleCrossCancelIcon} size={14} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {scene.evidence && (
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500"><Icon icon={InformationCircleIcon} size={13} />What the check showed</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-300">{scene.evidence}</p>
          </div>
        )}
        <p className="px-4 pt-3 pb-1 text-[12px] text-zinc-500">Flag only what looks wrong. Some details are ordinary.</p>
        <ul className="px-2 pb-2">
          {clues.map((clue, index) => (
            <li key={clue.field + clue.value}>
              <button
                type="button"
                role="checkbox"
                aria-checked={clue.tagged}
                disabled={busy}
                onClick={() => onTag(index)}
                className={cn("flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors disabled:cursor-wait", clue.tagged ? "bg-[#e5484d]/[0.12]" : "hover:bg-white/[0.05]")}
              >
                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px]", clue.tagged ? "bg-[#e5484d] text-white" : "ring-1 ring-white/25")}>
                  {clue.tagged && <Icon icon={CheckTickSquareIcon} size={12} strokeWidth={2.5} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-zinc-500">{clue.field}</span>
                  <span className={cn("block text-[13px] break-words", clue.tagged ? "text-white" : "text-zinc-200")}>{clue.value}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.aside>
  );
}

function Feedback({ item, last, onNext, children }: { item: ReviewItem; last: boolean; onNext: () => void; children?: ReactNode }) {
  const missed = item.clues.filter(clue => clue.explanation && !clue.tagged);
  const falseFlags = item.clues.filter(clue => !clue.explanation && clue.tagged);
  const caught = item.clues.filter(clue => clue.explanation && clue.tagged);
  const good = item.correct;
  return (
    <motion.div className={modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="m-auto w-full max-w-[520px] rounded-xl bg-[#18181b] text-zinc-100 ring-1 ring-white/10"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex gap-3 p-6 pb-5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", good ? "bg-[#30a46c]/15 text-[#3dd68c]" : "bg-[#e5484d]/15 text-[#ff6369]")}>
            <Icon icon={good ? ShieldCheckIcon : AlertTriangleIcon} size={18} />
          </span>
          <div className="min-w-0">
            <p className={cn("text-[12px] font-medium", good ? "text-[#3dd68c]" : "text-[#ff6369]")}>{good ? "Safe decision" : "Risky decision"}</p>
            <h2 id="feedback-title" className="mt-0.5 text-[17px] font-semibold">{item.action}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-400">{item.consequence}</p>
          </div>
        </div>

        <dl className="mx-6 grid grid-cols-3 rounded-lg bg-white/[0.04] text-center ring-1 ring-white/[0.06]">
          {[["Decision", item.decisionPoints], ["Evidence", item.evidencePoints], ["Total", item.points]].map(([label, value], index) => (
            <div key={label} className={cn("py-3", index > 0 && "border-l border-white/[0.06]")}>
              <dt className="text-[11px] text-zinc-500">{label}</dt>
              <dd className={cn("mt-0.5 text-[18px] font-semibold tabular-nums", index === 2 && "text-white")}>+<CountUp value={Number(value)} /></dd>
            </div>
          ))}
        </dl>
        {children}

        <div className="max-h-[38vh] space-y-4 overflow-y-auto px-6 pt-5">
          {!item.inspected && (
            <p className="flex gap-2 text-[13px] leading-relaxed text-[#f5d90a]">
              <Icon icon={InformationCircleIcon} size={16} className="mt-0.5 shrink-0" />
              You decided without checking, so there were no evidence points this time.
            </p>
          )}
          <ClueGroup title="Caught" tone="good" clues={caught} />
          <ClueGroup title="Missed" tone="bad" clues={missed} />
          <ClueGroup title="Flagged but ordinary" tone="neutral" clues={falseFlags} />
          <div className="flex gap-2.5 rounded-lg bg-white/[0.04] p-3 text-[13px] leading-relaxed text-zinc-300">
            <Icon icon={BulbOnIcon} size={16} className="mt-0.5 shrink-0 text-zinc-400" />
            {item.lesson}
          </div>
        </div>
        <div className="mt-5 border-t border-white/[0.06] p-4">
          <button type="button" autoFocus onClick={onNext} className={primaryButton}>{last ? "See results" : "Next situation"}</button>
        </div>
      </motion.section>
    </motion.div>
  );
}

function ClueGroup({ title, tone, clues }: { title: string; tone: "good" | "bad" | "neutral"; clues: ReviewItem["clues"] }) {
  if (!clues.length) return null;
  const icon = tone === "good" ? CheckTickCircleIcon : tone === "bad" ? MultipleCrossCancelCircleIcon : MinusCircleIcon;
  const color = tone === "good" ? "text-[#3dd68c]" : tone === "bad" ? "text-[#ff6369]" : "text-zinc-500";
  return (
    <section>
      <h3 className="text-[12px] font-medium text-zinc-500">{title}</h3>
      <ul className="mt-1.5 space-y-2">
        {clues.map(clue => (
          <li key={clue.field + clue.value} className="flex gap-2.5 text-[13px]">
            <Icon icon={icon} size={15} className={cn("mt-0.5 shrink-0", color)} />
            <span className="min-w-0">
              <span className="text-zinc-400">{clue.field}:</span> <span className="break-words text-zinc-100">{clue.value}</span>
              {clue.explanation && <span className="mt-0.5 block text-[12px] leading-relaxed text-zinc-500">{clue.explanation}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function verdict(xp: number) {
  if (xp >= 90) return "Nothing got past you.";
  if (xp >= 75) return "Strong run. A clue or two slipped by.";
  if (xp >= 55) return "Good instincts. Check a little more before deciding.";
  if (xp >= 30) return "You got caught somewhere. A replay will make it stick.";
  return "The phishers had a good day. Try it again.";
}

/** Lumi reacts to the score and points at the next mission. */
function DebriefGuide({ game, xp }: { game: Game; xp: number }) {
  const index = games.findIndex(item => item.slug === game.slug);
  const next = index >= 0 ? games[(index + 1) % games.length] : games[0];
  const takeaway = learningFor(game.slug)?.takeaways[xp >= 75 ? 2 : 1];
  const line = xp >= 75
    ? `Clean catch. You saw the lure for what it was.${takeaway ? ` One more habit to keep: ${takeaway}` : ""}`
    : xp >= 40
      ? `Close. A couple of lures got past you.${takeaway ? ` Remember: ${takeaway}` : ""}`
      : `That one got you, and that’s exactly why we practise here.${takeaway ? ` Try this next time: ${takeaway}` : ""}`;
  return (
    <div className="mt-5 flex items-center gap-4 rounded-lg bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
      <div className="w-20 shrink-0"><Lumi mood={xp >= 75 ? "chill" : xp >= 40 ? "suspicious" : "nope"} label="Lumi the angler fish" /></div>
      <div className="min-w-0">
        <p className="text-[14px] leading-relaxed text-zinc-200">{line}</p>
        {game.slug !== next.slug && (
          <Link href={`/games/${next.slug}`} className="mt-2 inline-flex text-[13px] font-semibold text-white underline underline-offset-4 hover:text-zinc-300">Next mission: {next.title}</Link>
        )}
      </div>
    </div>
  );
}

/** The headline of the results: hooked, boss beaten, or survived, with the arcade score. */
function ArcadeResult({ arcade, bossBeaten, title }: { arcade: SceneMissionView["arcade"]; bossBeaten: boolean; title: string }) {
  const still = useReducedMotion();
  const outcome = arcade.hooked
    ? { label: "Hooked", note: "Two wrong calls and the phisher reeled you in before the boss.", tone: "text-[#ff6369]", ring: "ring-[#e5484d]/40 bg-[#e5484d]/10" }
    : bossBeaten
      ? { label: "Boss beaten", note: "You saw through the final, sneakiest one.", tone: "text-[#3dd68c]", ring: "ring-[#30a46c]/40 bg-[#30a46c]/10" }
      : { label: "Survived", note: "You made it to the end, but the boss got a bite in.", tone: "text-[#f5a524]", ring: "ring-[#f5a524]/40 bg-[#f5a524]/10" };
  return (
    <motion.div
      className={cn("mb-5 flex flex-wrap items-center gap-4 rounded-xl p-4 ring-1", outcome.ring)}
      initial={still ? false : { scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-zinc-500">Mission complete · {title}</p>
        <p className={cn("text-[28px] font-bold tracking-tight", outcome.tone)}>{outcome.label}</p>
        <p className="text-[13px] text-zinc-400">{outcome.note}</p>
      </div>
      <dl className="flex gap-5 text-right">
        <div><dt className="text-[11px] text-zinc-500">Arcade score</dt><dd className="text-[24px] font-bold text-[#f5a524] tabular-nums"><CountUp value={arcade.score} duration={1.4} /></dd></div>
        <div><dt className="text-[11px] text-zinc-500">Best combo</dt><dd className="text-[24px] font-bold tabular-nums">{Math.min(arcade.best, 3)}×</dd></div>
        <div><dt className="text-[11px] text-zinc-500">Lives left</dt><dd className="text-[24px] font-bold tabular-nums">{arcade.lives}/{arcade.livesMax}</dd></div>
      </dl>
    </motion.div>
  );
}

function Debrief({ game, review, xp, arcade, saved, accent, onReplay, loadReport }: {
  game: Game; review: ReviewItem[]; xp: number; arcade: SceneMissionView["arcade"]; saved: { xp: number; correct: boolean } | null | undefined; accent: string; onReplay: () => void;
  loadReport: () => Promise<MissionReport | { error: string } | null>;
}) {
  const caught = review.reduce((sum, item) => sum + item.clues.filter(clue => clue.explanation && clue.tagged).length, 0);
  const available = review.reduce((sum, item) => sum + item.clues.filter(clue => clue.explanation).length, 0);
  const falseFlags = review.reduce((sum, item) => sum + item.clues.filter(clue => !clue.explanation && clue.tagged).length, 0);
  const secondary = "inline-flex h-10 items-center rounded-lg px-4 text-[14px] font-medium text-zinc-200 ring-1 ring-white/15 hover:bg-white/[0.06]";
  return (
    <motion.div className="absolute inset-0 z-50 overflow-y-auto bg-[#0f0f12] p-4 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {xp >= 75 && <Confetti accent={accent} />}
      <section role="dialog" aria-modal="true" aria-labelledby="debrief-title" className="mx-auto max-w-2xl py-4">
        <ArcadeResult arcade={arcade} bossBeaten={Boolean(review.at(-1)?.correct)} title={game.title} />
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <h2 id="debrief-title" className="text-[44px] font-semibold tracking-tight tabular-nums">
            <CountUp value={xp} duration={1.2} />
            <span className="ml-1 text-[20px] font-medium text-zinc-500">/ 100 XP</span>
          </h2>
        </div>
        <p className="mt-1 text-[15px] text-zinc-400">{verdict(xp)}</p>
        <DebriefGuide game={game} xp={xp} />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div className="h-full rounded-full" style={{ background: accent }} initial={{ width: 0 }} animate={{ width: `${xp}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
        </div>

        <dl className="mt-6 grid grid-cols-3 divide-x divide-white/[0.08] rounded-lg ring-1 ring-white/[0.08]">
          {[["Right calls", `${review.filter(item => item.correct).length}/${review.length}`], ["Clues caught", `${caught}/${available}`], ["False flags", String(falseFlags)]].map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <dt className="text-[12px] text-zinc-500">{label}</dt>
              <dd className="mt-0.5 text-[20px] font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 text-[13px] font-medium text-zinc-400">Situations</h3>
        <ol className="mt-2 divide-y divide-white/[0.06] rounded-lg ring-1 ring-white/[0.08]">
          {review.map(item => (
            <li key={item.subject} className="flex gap-3 p-4">
              <Icon icon={item.correct ? CheckTickCircleIcon : MultipleCrossCancelCircleIcon} size={18} className={cn("mt-0.5 shrink-0", item.correct ? "text-[#3dd68c]" : "text-[#ff6369]")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p className="text-[14px] font-medium">{item.subject}</p>
                  <span className="ml-auto text-[13px] text-zinc-400 tabular-nums">+{item.points} XP</span>
                </div>
                <p className="mt-0.5 text-[13px] text-zinc-500">You chose “{item.action}”.</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{item.lesson}</p>
              </div>
            </li>
          ))}
        </ol>

        <CoachReport load={loadReport} />

        <p className="mt-4 text-[12px] text-zinc-500">{saved ? "Saved to My scores." : "This run had already been saved, so it wasn’t counted again."}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onReplay} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200">
            <Icon icon={RefreshIcon} size={15} />Play again
          </button>
          <Link href="/scores" className={secondary}>My scores</Link>
          <Link href="/games" className={secondary}>All games</Link>
        </div>
      </section>
    </motion.div>
  );
}
