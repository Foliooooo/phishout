import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { MissionHost } from "@/components/missions/mission-host";
import { SandboxBrowser } from "@/components/sandbox-browser";
import { TerminalMission } from "@/components/missions/terminal-mission";
import { getGame } from "@/lib/games";
import { PageLoader } from "@/components/ascii-canvas";
import { LockedMission } from "@/components/progress";
import { canPlay, getProgress } from "@/lib/progress";

async function Play({ params, searchParams }: PageProps<"/games/[slug]/play">) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();
  // auth() uses crypto, so mark the page as request-time before calling it.
  await connection();
  const session = await auth();
  if (!session?.user.id || !session.sessionId) redirect(`/sign-in?next=${encodeURIComponent(`/games/${slug}/play`)}`);

  const progress = await getProgress(session.user.id, session.user.email);
  if (!canPlay(progress, slug)) return <LockedMission game={game} progress={progress} />;

  if (game.mode === "terminal") return <TerminalMission game={game} />;

  const { mode } = await searchParams;
  if (game.mode === "sandbox" && mode !== "native") {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4">
        <SandboxBrowser slug={slug} title={game.title} url={game.startUrl} nativeHref={`/games/${slug}/play?mode=native`} />
      </main>
    );
  }
  return <MissionHost slug={slug} />;
}

export default function Page(props: PageProps<"/games/[slug]/play">) {
  return (
    <Suspense fallback={<div className="px-3 py-8 sm:px-4"><PageLoader label="checking your session" /></div>}>
      <Play {...props} />
    </Suspense>
  );
}
