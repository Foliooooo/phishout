import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageLoader } from "@/components/ascii-canvas";
import { EndlessHost } from "@/components/missions/mission-host";
import { LockedMission } from "@/components/progress";
import { endlessGame } from "@/lib/games";
import { canPlay, getProgress } from "@/lib/progress";
import { inPartyWith } from "@/lib/party";

async function Play() {
  await connection();
  const session = await auth();
  if (!session?.user.id || !session.sessionId) redirect("/sign-in?next=%2Fgames%2Fendless%2Fplay");
  const progress = await getProgress(session.user.id, session.user.email);
  if (!canPlay(progress, "endless") && !await inPartyWith(session.user.id, "endless")) return <LockedMission game={endlessGame} progress={progress} />;
  return <EndlessHost />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="px-3 py-8 sm:px-4"><PageLoader label="checking your session" /></div>}>
      <Play />
    </Suspense>
  );
}
