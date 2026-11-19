import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageLoader } from "@/components/ascii-canvas";
import { LumiGuide } from "@/components/lumi-guide";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEVELS, levelOf } from "@/lib/levels";
import { DURATIONS, myParties, partyMissions } from "@/lib/party";
import { createPartyAction, joinPartyAction } from "./actions";

export const metadata: Metadata = { title: "LAN party · PHISH OUT", description: "Host a PHISH//OUT party with a join code and a live leaderboard." };

const ERRORS: Record<string, string> = {
  code: "That doesn’t look like a party code. Codes are 6 letters and numbers.",
  closed: "That party is over, full, or doesn’t exist.",
  missions: "Pick at least one mission for the party.",
};

const field = "h-12 w-full rounded-2xl bg-paper-deep px-4 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand";

async function Party({ searchParams }: PageProps<"/party">) {
  await connection();
  const session = await auth();
  const { error, code } = await searchParams;
  const mine = session?.user.id ? await myParties(session.user.id) : [];
  const message = typeof error === "string" ? ERRORS[error] : null;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-ink p-6 text-paper sm:p-10">
        <p className="font-mono text-sm font-bold text-brand">LAN party</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight sm:text-6xl">Get phished together.</h1>
        <p className="mt-3 max-w-2xl text-lg text-paper/80">Host a room, put the join code on the big screen, and everyone in the room plays on their own phone or laptop. A live leaderboard ranks the party’s best runs.</p>
      </header>

      {message ? <p role="alert" className="rounded-2xl bg-danger/15 p-4 font-semibold">{message}</p> : null}

      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <form action={joinPartyAction} className="flex flex-col rounded-3xl bg-paper-raised p-6">
          <h2 className="text-2xl font-bold">Join a party</h2>
          <p className="mt-1 text-ink-soft">Type the code on the host’s screen, or scan its QR code.</p>
          <label htmlFor="code" className="mt-5 text-sm font-bold">Party code</label>
          <input id="code" name="code" required autoComplete="off" autoCapitalize="characters" maxLength={7} defaultValue={typeof code === "string" ? code : ""} placeholder="ABC123" className={cn(field, "mt-1 text-center font-mono text-2xl tracking-[0.3em] uppercase")} />
          <Button type="submit" className="mt-4">Join</Button>
          {mine.length ? (
            <div className="mt-6 border-t border-paper-deep pt-4">
              <p className="text-sm font-bold">Your open parties</p>
              <ul className="mt-2 space-y-1">
                {mine.map(party => (
                  <li key={party._id}><Link href={`/party/${party._id}`} className="flex justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-paper-deep"><span className="truncate font-semibold">{party.name}</span><span className="font-mono">{party._id}</span></Link></li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>

        <form action={createPartyAction} className="rounded-3xl bg-paper-raised p-6">
          <h2 className="text-2xl font-bold">Host a party</h2>
          {session?.user.id ? null : <p className="mt-1 text-ink-soft"><Link href="/sign-in?next=%2Fparty" className="font-semibold text-brand underline underline-offset-4">Sign in</Link> to host.</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="name" className="text-sm font-bold">Party name</label>
              <input id="name" name="name" maxLength={40} placeholder="CSE lab, Friday night" className={cn(field, "mt-1")} />
            </div>
            <div>
              <label htmlFor="hours" className="text-sm font-bold">Runs for</label>
              <select id="hours" name="hours" defaultValue="2" className={cn(field, "mt-1")}>
                {DURATIONS.map(hours => <option key={hours} value={hours}>{hours} {hours === 1 ? "hour" : "hours"}</option>)}
              </select>
            </div>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-bold">Missions</legend>
            <p className="text-sm text-ink-soft">Everyone in the party can play these, even Expert ones they haven’t unlocked yet.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {partyMissions.map(game => {
                const level = game.slug === "endless" ? "expert" : levelOf(game.slug);
                return (
                  <label key={game.slug} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-paper px-3 py-2 has-[:checked]:bg-brand-soft">
                    <input type="checkbox" name="missions" value={game.slug} defaultChecked={level === "novice"} className="size-5 accent-brand" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{game.title}</span><span className="text-xs text-ink-soft">{LEVELS[level].title}{game.mode !== "native" ? ` · ${game.mode === "terminal" ? "VM terminal" : "VM browser"}` : ""}</span></span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Button type="submit" className="mt-5" disabled={!session?.user.id}>Start the party</Button>
        </form>
      </div>

      <LumiGuide
        title="Lumi’s party tips"
        lines={[
          { text: "Put the big-screen view on a projector. It shows the join code, a QR code and the live leaderboard." },
          { text: "Everyone needs their own account so their runs count. Signing up takes under a minute." },
          { text: "The score is the arcade score: right calls, combos, speed and the boss round. Only each player’s best run per mission counts.", mood: "suspicious" },
          { text: "Sandbox and terminal missions use the VM, which takes four players at a time. For big rooms, stick to in-tab missions.", href: "/games", cta: "See all missions" },
        ]}
      />
    </div>
  );
}

export default function PartyPage(props: PageProps<"/party">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-8 sm:px-4">
      <Suspense fallback={<PageLoader label="loading parties" />}>
        <Party {...props} />
      </Suspense>
    </main>
  );
}
