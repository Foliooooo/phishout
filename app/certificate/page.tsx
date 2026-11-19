import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageLoader } from "@/components/ascii-canvas";
import { CertificateActions, CertificateView } from "@/components/certificate";
import { LumiGuide } from "@/components/lumi-guide";
import { LevelCard } from "@/components/progress";
import { buttonStyles } from "@/components/ui/button";
import { getGame } from "@/lib/games";
import { getProfile } from "@/lib/profiles";
import { getProgress, issueCertificate } from "@/lib/progress";

export const metadata: Metadata = { title: "Certificate · PHISH OUT" };

async function Certificate() {
  await connection();
  const session = await auth();
  if (!session?.user.id || !session.sessionId) redirect("/sign-in?next=%2Fcertificate");
  const progress = await getProgress(session.user.id, session.user.email);

  if (progress.certified) {
    const certificate = await issueCertificate(session.user.id, progress);
    if (certificate) {
      return (
        <div className="space-y-5">
          <div className="text-center print:hidden">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">You did it.</h1>
            <p className="mt-2 text-ink-soft">Every mission cleared. Anyone can check this certificate with its ID.</p>
          </div>
          <CertificateView certificate={{ id: certificate._id, name: certificate.name, issuedAt: certificate.issuedAt.toISOString(), totalXp: certificate.totalXp, missions: certificate.missions }} />
          <CertificateActions id={certificate._id} />
          <p className="text-center text-sm text-ink-soft print:hidden">The name comes from your <Link href="/profile" className="font-semibold underline underline-offset-2">profile</Link>. Change it there and this page updates.</p>
        </div>
      );
    }
  }

  const left = [...progress.novice.left, ...progress.expert.left].map(slug => getGame(slug)).filter(Boolean);
  const next = left[0];
  const profile = progress.admin ? await getProfile(session.user.id) : null;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your certificate</h1>
        <p className="mt-2 text-ink-soft">Clear every Novice and Expert mission and it’s yours, with an ID anyone can verify.</p>
      </header>
      <LumiGuide
        title="Lumi, your guide"
        lines={[
          { text: `You’re ${left.length} ${left.length === 1 ? "mission" : "missions"} away from your certificate.${next ? ` Next up: ${next.title}.` : ""}`, href: next ? `/games/${next.slug}` : undefined, cta: next ? `Open ${next.title}` : undefined },
          { text: "Each mission needs 50 XP or more to count. Didn’t make it? Replay it. Only your best run matters." },
        ]}
      />
      <LevelCard progress={progress} />
      {progress.admin ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Admin preview</h2>
          <CertificateView certificate={{ id: "PREVIEW00000", name: profile?.displayName?.trim() || "PHISH//OUT player", issuedAt: new Date().toISOString(), totalXp: progress.totalXp, missions: 11, preview: true }} />
        </section>
      ) : null}
      <Link href="/games" className={buttonStyles()}>Back to missions</Link>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-8 sm:px-4">
      <Suspense fallback={<PageLoader label="checking your progress" />}>
        <Certificate />
      </Suspense>
    </main>
  );
}
