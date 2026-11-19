import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PartyBoard } from "@/components/party-board";
import { getParty, isOpen, normalizeCode, partyLeaderboard } from "@/lib/party";
import { brandedQrSvg } from "@/lib/qr";
import { joinUrl } from "@/lib/party-url";

export const metadata: Metadata = { title: "Party screen · PHISH OUT" };

/** Projector view: join code, QR and the live leaderboard, covering the whole window. */
async function Screen({ params }: PageProps<"/party/[code]/screen">) {
  await connection();
  const code = normalizeCode((await params).code);
  const party = code ? await getParty(code) : null;
  if (!code || !party) return <p className="p-10 text-3xl">No party with that code.</p>;
  const url = await joinUrl(code);
  const rows = await partyLeaderboard(party);
  const qr = brandedQrSvg(url, { size: 512, margin: 2 });

  return (
    <div className="fixed inset-0 z-[90] grid grid-cols-1 gap-8 overflow-y-auto bg-[#1c1317] p-8 text-[#f6ecdd] lg:grid-cols-[minmax(320px,0.8fr)_1.6fr] lg:p-12">
      <aside className="flex flex-col">
        <p className="font-mono text-xl font-bold text-[#ff5fa2]">PHISH//OUT · LAN party</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">{party.name}</h1>
        <p className="mt-8 text-2xl text-[#f6ecdd]/70">Join with code</p>
        <p className="font-mono text-[clamp(3rem,6.5vw,7rem)] leading-none font-bold tracking-[0.12em] text-[#ff5fa2]">{code}</p>
        <div className="mt-6 w-full max-w-[320px] rounded-3xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`QR code to join: ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="mt-3 break-all font-mono text-xl text-[#f6ecdd]/70">{url}</p>
        <Link href={`/party/${code}`} className="mt-auto pt-6 text-lg text-[#f6ecdd]/60 underline underline-offset-4">Leave big screen</Link>
      </aside>
      <PartyBoard screen code={code} initial={{ name: party.name, open: isOpen(party), endsAt: party.endsAt.toISOString(), members: party.members.length, rows }} />
    </div>
  );
}

export default function PartyScreenPage(props: PageProps<"/party/[code]/screen">) {
  return (
    <Suspense fallback={null}>
      <Screen {...props} />
    </Suspense>
  );
}
