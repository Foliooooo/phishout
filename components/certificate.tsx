"use client";

import { Lumi } from "@/components/lumi";
import { Icon } from "@/components/missions/icon";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyIcon, PrinterIcon } from "@pikaicons/core-free";
import { useState } from "react";

const longDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });

export type CertificateData = { id: string; name: string; issuedAt: string; totalXp: number; missions: number; preview?: boolean };

/** The certificate itself: landscape, printable, verifiable by its ID. */
export function CertificateView({ certificate }: { certificate: CertificateData }) {
  return (
    <article className="certificate relative mx-auto aspect-[1.414] w-full max-w-4xl overflow-hidden rounded-3xl bg-[#fffaf3] text-[#2b1d24] print:rounded-none">
      {/* Border frame. */}
      <div aria-hidden className="absolute inset-3 rounded-[1.25rem] border-4 border-[#ff5fa2] sm:inset-5" />
      <div aria-hidden className="absolute inset-5 rounded-2xl border border-dashed border-[#ff5fa2]/60 sm:inset-8" />
      {certificate.preview ? (
        <p aria-hidden className="pointer-events-none absolute inset-0 flex -rotate-12 items-center justify-center text-[11vw] font-bold text-[#ff5fa2]/10 sm:text-8xl">PREVIEW</p>
      ) : null}

      <div className="relative flex h-full flex-col items-center justify-center px-[8%] text-center">
        <p className="font-mono text-[clamp(10px,1.8vw,16px)] font-bold tracking-[0.25em] text-[#ff5fa2]">PHISH//OUT</p>
        <h1 className="mt-[1.5%] text-[clamp(20px,4.6vw,46px)] leading-tight font-bold tracking-tight">Certificate of Completion</h1>
        <p className="mt-[2%] text-[clamp(10px,1.7vw,16px)] text-[#6b5560]">This certifies that</p>
        <p className="mt-[1%] border-b-2 border-[#2b1d24] px-6 pb-1 text-[clamp(22px,5.4vw,54px)] leading-tight font-bold">{certificate.name}</p>
        <p className="mt-[2.5%] max-w-[46ch] text-[clamp(10px,1.7vw,16px)] leading-relaxed text-[#6b5560]">
          cleared all {certificate.missions} PHISH//OUT missions across the Novice and Expert levels, showing they can spot fake senders, misleading links, pressure tactics, bad attachments and forged headers.
        </p>
        <div className="mt-[3%] grid w-full grid-cols-3 items-end gap-4 text-[clamp(9px,1.4vw,13px)]">
          <div className="text-left">
            <p className="font-bold">{longDate.format(new Date(certificate.issuedAt))}</p>
            <p className="border-t border-[#2b1d24]/40 pt-1 text-[#6b5560]">Date issued</p>
          </div>
          <div className="mx-auto w-[clamp(60px,14vw,130px)]"><Lumi label="Lumi, the PHISH//OUT mascot" /></div>
          <div className="text-right">
            <p className="font-mono font-bold">{certificate.id}</p>
            <p className="border-t border-[#2b1d24]/40 pt-1 text-[#6b5560]">Certificate ID · {certificate.totalXp} XP</p>
          </div>
        </div>
        <p className="mt-[2%] font-mono text-[clamp(8px,1.1vw,11px)] text-[#6b5560]">Verify at phishout.folioo.tech/certificate/{certificate.id}</p>
      </div>
    </article>
  );
}

export function CertificateActions({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/certificate/${id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex flex-wrap justify-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={cn(buttonStyles(), "gap-2")}><Icon icon={PrinterIcon} size={18} />Print or save as PDF</button>
      <button type="button" onClick={() => void copy()} className={cn(buttonStyles({ variant: "secondary" }), "gap-2")}><Icon icon={CopyIcon} size={18} />{copied ? "Link copied" : "Copy verify link"}</button>
    </div>
  );
}
