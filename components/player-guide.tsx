import { auth } from "@/auth";
import { LumiGuide } from "@/components/lumi-guide";
import { guestLines, playerLines } from "@/lib/guide";
import { connection } from "next/server";
import { Suspense } from "react";

async function Guide({ className }: { className?: string }) {
  await connection();
  const session = await auth();
  let lines = guestLines();
  if (session?.user.id) {
    try {
      lines = await playerLines(session.user.id, session.user.email);
    } catch (error) {
      console.warn("Guide couldn’t load player progress", error instanceof Error ? error.message : error);
    }
  }
  return <LumiGuide lines={lines} title={session?.user.id ? "Lumi, your guide" : "Meet Lumi"} className={className} />;
}

/** Lumi’s personalised pointer to the player’s next mission. */
export function PlayerGuide({ className }: { className?: string }) {
  return (
    <Suspense fallback={<LumiGuide lines={guestLines().slice(0, 1)} title="Meet Lumi" className={className} />}>
      <Guide className={className} />
    </Suspense>
  );
}
