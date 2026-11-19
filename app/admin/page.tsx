import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { restartAdminLogin } from "@/app/admin/actions";
import { publishPracticeBrief } from "@/app/admin/practice-actions";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PracticeBriefForm } from "@/components/practice-brief-form";
import { Button, buttonStyles } from "@/components/ui/button";
import { adminChallengeCookie, adminEmail, adminSessionCookie, hasAdminChallenge, hasAdminSession } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { educatorEvidence } from "@/lib/educator";
import { skillNames } from "@/lib/learning";
import { practiceBriefs } from "@/lib/practice-briefs";
import { getGame } from "@/lib/games";
import { PageLoader } from "@/components/ascii-canvas";

export const metadata: Metadata = { title: "Admin · PHISH OUT", robots: { index: false, follow: false } };

async function AdminContent() {
  const jar = await cookies();
  if (!await hasAdminSession(jar.get(adminSessionCookie)?.value)) {
    const pending = await hasAdminChallenge(jar.get(adminChallengeCookie)?.value);
    return <AdminLoginForm key={pending ? "code" : "password"} codeStep={pending} email={adminEmail} />;
  }

  const [featured, cohort] = await Promise.all([practiceBriefs().findOne({ _id: "featured" }), educatorEvidence()]);

  return (
    <section className="w-full max-w-2xl rounded-3xl bg-paper-raised p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Admin</h1>
        <form action={restartAdminLogin}>
          <Button type="submit" variant="secondary">Sign out of admin</Button>
        </form>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-paper-deep p-4">
          <h2 className="text-xl font-bold">Sandbox VM</h2>
          <p className="mt-2 text-ink-soft">Open your instance in AWS and choose Connect.</p>
          <a href="https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#InstanceDetails:instanceId=i-03c47fecd9a8cbd71" className={cn(buttonStyles({ variant: "raised" }), "mt-4")}>Open EC2 console</a>
        </section>
        <section className="rounded-2xl bg-paper-deep p-4">
          <h2 className="text-xl font-bold">Training mailbox</h2>
          <p className="mt-2 text-ink-soft">Chrome on the VM opens Gmail. Sign in with the dedicated training account.</p>
          <a href="vnc://127.0.0.1:5901" className={cn(buttonStyles({ variant: "raised" }), "mt-4")}>Open VM desktop</a>
        </section>
      </div>
      <section className="mt-4 rounded-2xl bg-paper-deep p-4">
        <h2 className="text-xl font-bold">Connect to the desktop</h2>
        <p className="mt-2 text-ink-soft">Use your EC2 SSH key to open the tunnel and keep it running while connected.</p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-paper-raised p-3 font-mono text-sm">ssh -i /path/to/key.pem -N -L 127.0.0.1:5901:127.0.0.1:5901 ubuntu@13.202.101.96</code>
        <p className="mt-3 text-ink-soft">Read the desktop password in a separate SSH session, then enter it in your VNC client.</p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-paper-raised p-3 font-mono text-sm">sudo cat /var/lib/phish-mail/vnc-client-password</code>
      </section>
      <section id="practice-brief" className="mt-4 rounded-2xl bg-paper-deep p-4">
        <h2 className="text-xl font-bold">Featured practice</h2>
        <p className="mt-2 text-ink-soft">Draft a coaching brief for an existing sandbox mission. Review it before publishing it to My scores.</p>
        {featured?.published && <p className="mt-2">Currently featured · {featured.published.title}</p>}
        <PracticeBriefForm />
        {featured?.draft && (
          <form action={publishPracticeBrief} className="mt-4 rounded-2xl bg-paper-raised p-4">
            <input type="hidden" name="revision" value={featured.draft.revision} />
            <h3 className="text-lg font-bold">{featured.draft.title}</h3>
            <p className="mt-1 text-ink-soft">{getGame(featured.draft.slug)?.title} · {featured.draft.objective}</p>
            <Button className="mt-4" type="submit">Publish brief</Button>
          </form>
        )}
      </section>
      <section className="mt-4 rounded-2xl bg-paper-deep p-4">
        <h2 className="text-xl font-bold">Learning gaps</h2>
        {cohort ? (
          <>
            <p className="mt-2 text-ink-soft">Latest measured run per mission across {cohort.learners} players.</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {skillNames.map((name, index) => {
                const [found, available, falseFlags] = cohort.evidence[index];
                return <div key={name} className="rounded-2xl bg-paper-raised p-3">
                  <dt className="font-bold">{name}</dt>
                  <dd>{available ? `${available - found}/${available} clues missed` : "No scored clues yet"} · {falseFlags} false flags</dd>
                </div>;
              })}
            </dl>
          </>
        ) : <p className="mt-2 text-ink-soft">Group results appear once five players finish measured missions.</p>}
      </section>
    </section>
  );
}

export default function Page() {
  return (
    <main className="mx-auto grid w-full flex-1 place-items-center px-4 py-10 sm:py-16">
      <Suspense fallback={<PageLoader label="opening admin" />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}
