import { ScrollReveal } from "@/components/scroll-reveal";
import { TeamCredit } from "@/components/team-credit";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-16 overflow-hidden sm:mt-20", className)}>
      <svg
        aria-hidden
        viewBox="0 0 1512 78"
        preserveAspectRatio="none"
        className="block h-[clamp(1.5rem,5vw,4.75rem)] w-full fill-paper-deep"
      >
        <path d="M0 76 C22 69 42 45 50 27 C75 16 108 40 134 57 S175 71 197 49 S224 12 249 20 S305 49 342 62 S382 57 412 41 S431 22 450 29 S479 54 500 51 S545 13 564 11 S616 31 644 50 S678 80 702 64 S746 12 765 20 S806 49 828 62 S884 38 909 15 S944 8 971 25 S1028 58 1054 60 S1096 29 1101 16 C1120 4 1145 44 1176 57 S1205 56 1229 40 S1274 11 1296 16 S1342 42 1366 56 S1380 54 1397 52 S1427 42 1444 28 S1461 13 1479 29 S1500 50 1512 60 V78 H0 Z" />
      </svg>
      <div className="relative -mt-px bg-paper-deep pb-3 sm:pb-5">
        <ScrollReveal className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 sm:pt-3">
          <div data-reveal className="grid gap-9 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-3xl font-bold tracking-tight sm:text-5xl">
                Train the human firewall.
              </p>
              <p className="mt-3 max-w-sm text-ink-soft">
                Get better at spotting phishing in a throwaway browser sandbox.
              </p>
              <TeamCredit className="mt-6 h-11 px-5 text-sm" />
            </div>
            <nav aria-label="Footer" className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Link href="/games" className={buttonStyles()}>Games</Link>
              <Link href="/leaderboard" className={buttonStyles({ variant: "raised" })}>Leaderboard</Link>
              <Link href="/game-info" className={buttonStyles({ variant: "raised" })}>Game info</Link>
              <Link href="/impact" className={buttonStyles({ variant: "raised" })}>Impact</Link>
              <Link href="/for-teams" className={buttonStyles({ variant: "raised" })}>For teams</Link>
              <Link href="/#how" className={buttonStyles({ variant: "raised" })}>
                How it works
              </Link>
            </nav>
          </div>
        </ScrollReveal>
        <div
          aria-hidden
          className="pointer-events-none mt-8 select-none whitespace-nowrap px-3 text-center text-[min(15.8vw,20rem)] leading-none font-black tracking-[-0.065em] text-ink/15 sm:mt-10"
        >
          PHISH<span className="text-brand-deep/40">{"//"}</span>OUT
        </div>
        <div className="mt-3 flex justify-center px-5 sm:mt-5">
          <a
            href="https://folioo.tech/"
            className={cn(buttonStyles({ variant: "raised", size: "sm" }), "h-11 rounded-full")}
          >
            <span className="text-ink-soft">Powered by</span>
            <Image src="/folioo-mark.svg" alt="" width={20} height={20} unoptimized />
            <span>Folioo</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
