import type { Metadata } from "next";
import { Scales } from "@/components/ui/scales";
import { QR_URL, brandedQrSvg } from "@/lib/qr";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Scan to play · PHISH OUT",
  description: "Scan the QR code to play PHISH//OUT.",
};

const svg = brandedQrSvg();
const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const host = QR_URL.replace(/^https:\/\//, "");

/** A big, printable QR code for the hackathon booth: phishout.folioo.tech. */
export default function QrPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-3 py-8 text-center sm:px-4">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Scan to play</h1>
      <p className="mt-2 text-lg text-ink-soft">Get phished on purpose, in a browser that can’t hurt you.</p>

      <div className="relative mt-8 w-full max-w-[520px] overflow-hidden rounded-[2.5rem] bg-brand-soft p-6 sm:p-10">
        <Scales size={12} />
        <div
          className="relative mx-auto aspect-square w-full rounded-[1.75rem] bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <p className="mt-6 font-mono text-xl font-bold sm:text-2xl">{host}</p>
      <p className="mt-1 text-sm text-ink-soft">Before you scan any QR code, check where it leads. This one goes to {host}.</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        <a href={download} download="phishout-qr.svg" className={buttonStyles()}>Download SVG</a>
        <a href={QR_URL} className={buttonStyles({ variant: "secondary" })}>Open {host}</a>
      </div>
    </main>
  );
}
