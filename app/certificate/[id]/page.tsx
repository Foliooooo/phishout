import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoader } from "@/components/ascii-canvas";
import { CertificateActions, CertificateView } from "@/components/certificate";
import { Icon } from "@/components/missions/icon";
import { buttonStyles } from "@/components/ui/button";
import { findCertificate } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { CheckTickCircleIcon } from "@pikaicons/core-free";

export const metadata: Metadata = { title: "Verify certificate · PHISH OUT" };

async function Verify({ params }: PageProps<"/certificate/[id]">) {
  await connection();
  const { id } = await params;
  const certificate = await findCertificate(id.toUpperCase());
  if (!certificate) {
    return (
      <div className="rounded-3xl bg-paper-raised p-8 text-center">
        <h1 className="text-3xl font-bold">No certificate with that ID</h1>
        <p className="mt-2 text-ink-soft">Check the ID and try again. IDs are 12 characters, letters A–F and numbers.</p>
        <Link href="/" className={cn(buttonStyles({ variant: "secondary" }), "mt-5")}>PHISH//OUT home</Link>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <p className="mx-auto flex w-fit items-center gap-2 rounded-full bg-safe/15 px-4 py-2 text-sm font-bold print:hidden">
        <Icon icon={CheckTickCircleIcon} size={18} className="text-safe" />Verified: issued by PHISH//OUT
      </p>
      <CertificateView certificate={{ id: certificate._id, name: certificate.name, issuedAt: certificate.issuedAt.toISOString(), totalXp: certificate.totalXp, missions: certificate.missions }} />
      <CertificateActions id={certificate._id} />
    </div>
  );
}

export default function VerifyPage(props: PageProps<"/certificate/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-8 sm:px-4">
      <Suspense fallback={<PageLoader label="checking the certificate" />}>
        <Verify {...props} />
      </Suspense>
    </main>
  );
}
