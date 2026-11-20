import type { Metadata } from "next";
import Link from "next/link";
import { LumiGuide } from "@/components/lumi-guide";
import { Icon } from "@/components/missions/icon";
import { buttonStyles } from "@/components/ui/button";
import { games } from "@/lib/games";
import { BADGES, EXPERT_MISSIONS, NOVICE_MISSIONS } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { AwardMedalIcon, GraphTrendLineUpwardIcon, LockCloseIcon, UserPlusIcon } from "@pikaicons/core-free";

export const metadata: Metadata = {
  title: "For schools and teams · PHISH OUT",
  description: "Run a PHISH//OUT session for a class, a college or a company: a LAN party, room insights and verifiable certificates.",
};

const AUDIENCES = [
  ["Schools and colleges", "A 45-minute lab session teaches students to spot UPI scams, fake job offers and look-alike sites, with a certificate at the end."],
  ["Companies", "Security-awareness training people actually finish: short missions, a team leaderboard, and a report of where your people slip."],
  ["Cyber cells and NGOs", "Community workshops on the scams people meet every day, played on their own phones, in the room."],
];

const STEPS = [
  ["Host a party", "Pick the missions and how long the session runs. You get a 6-character code and a QR code for the projector."],
  ["Everyone plays", "People join on their own phone or laptop. Missions take 3 to 5 minutes each; everyone’s best runs count on the live leaderboard."],
  ["Talk it through", "The room’s insights show which warning signs this group missed most, so the debrief is about your people, not a generic slide deck."],
  ["Keep going", "Players continue on their own: Novice, then Expert, then a certificate anyone can verify."],
];

const GETS: [typeof UserPlusIcon, string, string][] = [
  [UserPlusIcon, "LAN parties", "Join codes, a QR code, a projector view and a live leaderboard for the room."],
  [GraphTrendLineUpwardIcon, "Room insights", "Which kinds of warning sign your group misses, and which missions were hardest."],
  [AwardMedalIcon, "Verifiable certificates", "Every certificate has an ID that anyone can check on a public page."],
  [LockCloseIcon, "Safe by design", "Every site, brand and link in the game is fictional. Sandbox missions run in throwaway, offline browsers."],
];

export default function ForTeamsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-3 py-8 sm:px-4">
      <header className="rounded-3xl bg-ink p-6 text-paper sm:p-10">
        <p className="font-mono text-sm font-bold text-brand">For schools and teams</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Phishing training people finish.</h1>
        <p className="mt-3 max-w-2xl text-lg text-paper/80">
          {games.length} hands-on missions, from fake job offers to UPI refund scams and forged email headers. Run them as a live session with a leaderboard, then see exactly where your group slips.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/party" className={buttonStyles()}>Host a session</Link>
          <Link href="/impact" className={buttonStyles({ variant: "raised" })}>See the measured impact</Link>
        </div>
      </header>

      <section aria-labelledby="who" className="grid gap-4 md:grid-cols-3">
        <h2 id="who" className="sr-only">Who it’s for</h2>
        {AUDIENCES.map(([title, body]) => (
          <div key={title} className="rounded-3xl bg-paper-raised p-6">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-2 text-ink-soft">{body}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="session" className="rounded-3xl bg-paper-raised p-6 sm:p-8">
        <h2 id="session" className="text-3xl font-bold tracking-tight">How a session runs</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-4">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="rounded-2xl bg-paper p-5">
              <p className="font-mono text-3xl font-bold text-brand">0{index + 1}</p>
              <h3 className="mt-2 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gets" className="grid gap-4 sm:grid-cols-2">
        <h2 id="gets" className="sr-only">What you get</h2>
        {GETS.map(([icon, title, body]) => (
          <div key={title} className="flex gap-4 rounded-3xl bg-paper-raised p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand"><Icon icon={icon} size={22} /></span>
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-ink-soft">{body}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="path" className="rounded-3xl bg-brand-soft p-6 sm:p-8">
        <h2 id="path" className="text-3xl font-bold tracking-tight">A clear learning path</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Novice", `${NOVICE_MISSIONS.length} everyday scams. Clear each with 50+ XP to move up.`],
            ["Expert", `${EXPERT_MISSIONS.length} harder missions, including forensics in a real terminal, plus Endless mode.`],
            ["Certificate", `${BADGES.length} badges along the way and a verifiable certificate at the end.`],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-paper p-5">
              <dt className="text-xl font-bold">{title}</dt>
              <dd className="mt-1 text-ink-soft">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="run" className={cn("grid gap-4 md:grid-cols-2")}>
        <div className="rounded-3xl bg-paper-raised p-6">
          <h2 id="run" className="text-2xl font-bold">What it takes to run</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-soft">
            <li>A browser on each device. No installs, no admin rights.</li>
            <li>The in-tab missions work on any network, even without our VM.</li>
            <li>Sandbox and terminal missions use our VM, which runs four at a time. For big rooms, stick to in-tab missions.</li>
            <li>Self-hosting: one Next.js app and MongoDB, with an optional VM for sandboxes. The code is ready to deploy with Docker.</li>
          </ul>
        </div>
        <div className="rounded-3xl bg-paper-raised p-6">
          <h2 className="text-2xl font-bold">Plans</h2>
          <ul className="mt-3 space-y-3">
            <li><b>Players: free.</b> <span className="text-ink-soft">Every mission, badges and the certificate.</span></li>
            <li><b>Institutions: planned.</b> <span className="text-ink-soft">Hosted sessions, saved room reports across sessions, and certificates with your organisation’s name. Talk to us if you want to pilot it.</span></li>
          </ul>
        </div>
      </section>

      <LumiGuide
        title="Lumi’s session tips"
        lines={[
          { text: "Start with Refund Rush and Inbox Trap. Everyone has seen those scams, so the room gets loud fast.", href: "/party", cta: "Host a session" },
          { text: "Put the big-screen view on the projector and leave it running. The live leaderboard does the motivating for you." },
          { text: "End with the room insights. The skill your group missed most is your one takeaway slide.", mood: "suspicious" },
        ]}
      />
    </main>
  );
}
