import type { Metadata } from "next";
import { LabFade, LabStats, NetworkLab, RequestTrace, SandboxFleet, SectionTitle } from "@/components/ai-lab";

export const metadata: Metadata = {
  title: "Under the hood · PHISH OUT",
  description: "How PHISH//OUT works: the request path, the live sandbox fleet, and the prediction model trained in your browser.",
};

export default function ArchitecturePage() {
  return (
    <main className="w-full flex-1 px-3 pb-10 sm:px-4">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-lab text-lab-strong">
        <section className="relative px-5 pt-12 pb-8 sm:px-10 sm:pt-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(color-mix(in_oklab,var(--color-lab-fg)_5%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-lab-fg)_5%,transparent)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative max-w-3xl">
            <p className="font-mono text-[12px] text-[#ff5fa2]">PHISH//OUT · under the hood</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-lab-strong sm:text-6xl">How PHISH//OUT works</h1>
            <p className="mt-4 text-[17px] leading-relaxed text-lab-soft">
              Server-owned scoring and levels, Gemini as a coach that never gives away the answer, a model that predicts where each player will slip, and disposable browsers and terminals for missions that need the real thing.
            </p>
          </div>
          <nav aria-label="Architecture sections" className="relative mt-6 flex flex-wrap gap-2">
            {[["Request trace", "request"], ["Sandbox fleet", "fleet"], ["Model demo", "model"]].map(([label, id]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-xl bg-lab-fg/10 px-4 text-sm font-semibold hover:bg-lab-fg/20">{label}</a>)}
          </nav>
          <div className="relative mt-8"><LabStats /></div>
        </section>

        <section id="request" className="scroll-mt-28 border-t border-lab-fg/[0.06] px-5 py-10 sm:px-10">
          <LabFade>
            <SectionTitle eyebrow="Request path" title="Trace a request">
              Pick something a player does and step through every part of the system it touches.
            </SectionTitle>
            <RequestTrace />
          </LabFade>
        </section>

        <section id="fleet" className="scroll-mt-28 border-t border-lab-fg/[0.06] px-5 py-10 sm:px-10">
          <LabFade>
            <SectionTitle eyebrow="Live VM" title="The sandbox fleet">
              Four disposable Chromium browsers on one VM, streamed to players as video. This panel reads the controller’s status live.
            </SectionTitle>
            <SandboxFleet />
          </LabFade>
        </section>

        <section id="model" className="scroll-mt-28 border-t border-lab-fg/[0.06] px-5 py-10 sm:px-10">
          <LabFade>
            <SectionTitle eyebrow="Prediction model" title="Train the network yourself">
              Seven sigmoid units, one per skill, each taking seven inputs. It’s the same architecture as the reference model in <code className="font-mono text-[13px] text-lab-text">model/</code>. Here it trains on 400 simulated players with hidden weaknesses; in production it trains on real, anonymised runs.
            </SectionTitle>
            <NetworkLab />
          </LabFade>
        </section>
      </div>
    </main>
  );
}
