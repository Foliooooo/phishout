import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountCodeForm } from "@/components/account-code-form";
import { ScrollReveal } from "@/components/scroll-reveal";
import { PageLoader } from "@/components/ascii-canvas";

export const metadata: Metadata = { title: "Reset password · PHISH OUT" };

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return (
    <main className="grid flex-1 place-items-center px-3 py-8 sm:px-4 sm:py-12">
      <ScrollReveal className="w-full max-w-md">
        <div data-reveal>
          <Suspense fallback={<PageLoader label="loading" className="h-48 sm:h-56" />}>
            {searchParams.then(({ next }) => (
              <AccountCodeForm purpose="reset" next={typeof next === "string" ? next : ""} />
            ))}
          </Suspense>
        </div>
      </ScrollReveal>
    </main>
  );
}
