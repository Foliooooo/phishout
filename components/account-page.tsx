import Image from "next/image";
import { Suspense } from "react";
import { AccountForm } from "@/components/account-form";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Scales } from "@/components/ui/scales";
import { cn } from "@/lib/utils";

export function AccountPage({
  mode,
  searchParams,
  className,
}: {
  mode: "sign-in" | "sign-up";
  searchParams: Promise<{ next?: string | string[]; result?: string | string[] }>;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto grid min-h-[calc(100svh-5.75rem)] w-full max-w-[96rem] flex-1 gap-5 px-3 pb-4 sm:min-h-[calc(100svh-7.25rem)] sm:px-4 sm:pb-6 md:grid-cols-[minmax(0,9fr)_minmax(0,11fr)]",
        className,
      )}
    >
      <div className="grid min-w-0 place-items-center px-3 py-9 sm:px-8 lg:px-12">
        <Suspense fallback={<p role="status" className="text-ink-soft">Loading account form…</p>}>
          {searchParams.then(({ next, result }) => (
            <AccountForm mode={mode} next={typeof next === "string" ? next : ""} result={typeof result === "string" ? result : undefined} />
          ))}
        </Suspense>
      </div>
      <ScrollReveal className="relative grid min-h-48 place-items-center overflow-hidden rounded-3xl bg-account-art px-5 py-6 text-on-brand sm:min-h-64 md:rounded-[2rem] md:px-8 md:py-10">
        <Scales size={16} color="color-mix(in oklab, var(--color-on-brand) 18%, transparent)" />
        <div data-reveal className="relative flex w-full flex-col items-center gap-3 text-center md:gap-4">
          <div className="relative isolate grid w-full max-w-48 place-items-center md:max-w-[min(100%,55svh,34rem)]">
            <div aria-hidden className="absolute inset-[5%] -z-10 rounded-[44%_56%_48%_52%/51%_43%_57%_49%] bg-account-art" />
            <div aria-hidden className="absolute inset-[7%] -z-10 rotate-12 rounded-[48%_52%_40%_60%/44%_56%_44%_56%] bg-brand/40" />
            <Image
              src={mode === "sign-in" ? "/illustrations/account-sign-in.svg" : "/illustrations/account-sign-up.svg"}
              alt=""
              width={480}
              height={480}
              unoptimized
              className="h-auto w-full"
            />
          </div>
          <p className="rounded-3xl bg-account-art px-4 py-1 text-xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            Train the human firewall.
          </p>
          <a
            href="https://streamlinehq.com"
            className="inline-flex min-h-11 items-center rounded-full bg-account-art px-3 text-sm font-medium text-on-brand/85 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-on-brand"
          >
            Illustrations by Streamline
          </a>
        </div>
      </ScrollReveal>
    </main>
  );
}
