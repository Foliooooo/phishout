import type { Metadata } from "next";
import Link from "next/link";
import { AsciiCanvas } from "@/components/ascii-canvas";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Not found · PHISH OUT" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 py-8 sm:px-4">
      <div className="relative h-[320px] overflow-hidden rounded-3xl bg-paper-raised sm:h-[420px]">
        <AsciiCanvas scene="lost" />
      </div>
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">This page took the bait.</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          There’s nothing at this address. If a link brought you here, check where it really pointed. That’s the whole game.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonStyles()}>Back to the arcade</Link>
          <Link href="/games" className={cn(buttonStyles({ variant: "secondary" }))}>All missions</Link>
        </div>
      </div>
    </main>
  );
}
