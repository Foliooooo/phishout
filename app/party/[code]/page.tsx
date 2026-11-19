import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageLoader } from "@/components/ascii-canvas";
import { PartyBoard } from "@/components/party-board";
import { Button, buttonStyles } from "@/components/ui/button";
import { endlessGame, getGame } from "@/lib/games";
import { getParty, isOpen, normalizeCode, partyLeaderboard } from "@/lib/party";
import { joinUrl } from "@/lib/party-url";
import { brandedQrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { endPartyAction, joinPartyAction } from "../actions";

export const metadata: Metadata = { title: "Party · PHISH OUT" };

async function Room({ params }: PageProps<"/party/[code]">) {
  await connection();
  const code = normalizeCode((await params).code);
  const party = code ? await getParty(code) : null;
  if (!code || !party) {
    return (
      <div className="rounded-3xl bg-paper-raised p-8 text-center">
        <h1 className="text-3xl font-bold">No party with that code</h1>
        <p className="mt-2 text-ink-soft">Check the code on the host’s screen and try again.</p>
        <Link href="/party" className={cn(buttonStyles(), "mt-5")}>Back to parties</Link>
      </div>
    );
  }
  const session = await auth();
  const userId = session?.user.id;
  const member = Boolean(userId && party.members.some(item => item.userId === userId));
  const host = userId === party.hostId;
  const open = isOpen(party);
  const rows = await partyLeaderboard(party, userId);
  const url = await joinUrl(code);
  const qr = brandedQrSvg(url, { size: 512, margin: 2 });
  const missions = party.missions.map(slug => (slug === "endless" ? endlessGame : getGame(slug))).filter(Boolean);

  return (
    <div className="space-y-5">
      <header className="grid gap-5 rounded-3xl bg-ink p-6 text-paper sm:p-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-sm font-bold text-brand">LAN party · {open ? "open" : "over"}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{party.name}</h1>
          <p className="mt-4 text-sm text-paper/70">Join code</p>
          <p className="font-mono text-6xl font-bold tracking-[0.2em] text-brand">{code}</p>
          <p className="mt-2 break-all font-mono text-sm text-paper/70">{url}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {!member && open ? (
              userId ? (
                <form action={joinPartyAction}><input type="hidden" name="code" value={code} /><Button type="submit">Join this party</Button></form>
              ) : (
                <Link href={`/sign-in?next=${encodeURIComponent(`/party/${code}`)}`} className={buttonStyles()}>Sign in to join</Link>
              )
            ) : null}
            <Link href={`/party/${code}/screen`} className={buttonStyles({ variant: "raised" })}>Open big screen</Link>
            {host && open ? (
              <form action={endPartyAction}><input type="hidden" name="code" value={code} /><Button type="submit" variant="secondary">End party</Button></form>
            ) : null}
          </div>
        </div>
        <div className="mx-auto w-48 rounded-2xl bg-white p-2 sm:w-56 [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`QR code to join: ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
      </header>

      {member && open ? (
        <section aria-labelledby="party-missions" className="rounded-3xl bg-paper-raised p-5 sm:p-6">
          <h2 id="party-missions" className="text-2xl font-bold">Party missions</h2>
          <p className="mt-1 text-ink-soft">Your best run in each one counts. Replays are allowed.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map(game => game && (
              <li key={game.slug}>
                <Link href={game.slug === "endless" ? "/games/endless/play" : `/games/${game.slug}/play`} prefetch={false} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 font-semibold transition-colors hover:bg-brand-soft">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-sm font-bold text-paper">{game.glyph}</span>
                  <span className="min-w-0 flex-1 truncate">{game.title}</span>
                  <span className="text-sm text-brand">Play</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PartyBoard code={code} initial={{ name: party.name, open, endsAt: party.endsAt.toISOString(), members: party.members.length, rows }} />
    </div>
  );
}

export default function PartyRoomPage(props: PageProps<"/party/[code]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-8 sm:px-4">
      <Suspense fallback={<PageLoader label="joining the party" />}>
        <Room {...props} />
      </Suspense>
    </main>
  );
}
