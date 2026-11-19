import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageLoader } from "@/components/ascii-canvas";
import { ProfileForm } from "@/components/profile-form";
import { playerAlias } from "@/lib/leaderboard";
import { avatarUrl, getProfile } from "@/lib/profiles";

export const metadata: Metadata = { title: "Profile · PHISH OUT" };

async function Profile() {
  await connection();
  const session = await auth();
  if (!session?.user.id || !session.sessionId) redirect("/sign-in?next=%2Fprofile");
  const profile = await getProfile(session.user.id);
  return (
    <section className="rounded-3xl bg-paper-raised p-6 sm:p-8">
      <p className="mb-6 text-sm text-ink-soft">Signed in as <b className="text-ink">{session.user.email}</b>. Your email is never shown to other players.</p>
      <ProfileForm initialName={profile?.displayName ?? ""} initialAvatar={avatarUrl(profile)} alias={playerAlias(session.user.id)} />
    </section>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-8 sm:px-4">
      <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">Edit profile</h1>
      <Suspense fallback={<PageLoader label="loading profile" />}>
        <Profile />
      </Suspense>
    </main>
  );
}
