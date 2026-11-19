"use client";

import { Icon } from "@/components/missions/icon";
import { Lumi, type LumiMood } from "@/components/lumi";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CheckTickCircleIcon, SearchIcon } from "@pikaicons/core-free";
import Link from "next/link";
import { useState } from "react";

type Bait = { from: string; subject: string; phish: boolean; why: string };

// Short, fictional messages for Lumi to judge. Domains use reserved .example names.
const BAITS: Bait[] = [
  { from: "security@paypa1-support.example", subject: "Your account is locked. Verify within 30 minutes", phish: true, why: "A look-alike domain (paypa1) plus a countdown. That’s a lure with a timer on it." },
  { from: "riya@yourcompany.example", subject: "Notes from Tuesday’s design review", phish: false, why: "A colleague you know, your own domain, and nothing asked of you. Safe to open." },
  { from: "ceo.office@gmail.example", subject: "Quick favour: buy 5 gift cards, keep it quiet", phish: true, why: "Authority from a personal address, secrecy and gift cards. Call the real person." },
  { from: "no-reply@github.example", subject: "Your monthly security digest", phish: false, why: "An expected newsletter with no login link and no rush." },
  { from: "hr-payroll@yourcompany-hr.example", subject: "Updated salary slip.pdf.exe attached", phish: true, why: "A double extension hides a program, and that domain isn’t your company’s." },
];

const MOODS: { id: LumiMood; label: string; line: string }[] = [
  { id: "chill", label: "Chill", line: "Nothing fishy. Lumi just floats." },
  { id: "suspicious", label: "Suspicious", line: "Something’s off. Lumi checks the sender, the link and the ask." },
  { id: "nope", label: "Nope", line: "That’s a hook. Lumi backs off and reports it." },
];

const FACTS = [
  ["The lure", "Real anglers grow a glowing lure on their head to draw prey in close. A phishing email is the same trick: something shiny that gets you to come closer and click."],
  ["The jaw", "By the time prey sees the teeth, it’s too late. Phishers hide the ask (a password, a payment, a download) until you’re already on their page."],
  ["The glow", "Lumi kept the light but uses it to show you the way: on the home page, on every mission page, and in every briefing and debrief."],
];

export default function MascotPage() {
  const [mood, setMood] = useState<LumiMood>("chill");
  const [lure, setLure] = useState<"light" | "mail">("light");
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<null | { right: boolean }>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const current = BAITS[index % BAITS.length];

  function judge(phish: boolean) {
    if (verdict) return;
    const right = phish === current.phish;
    setVerdict({ right });
    setScore(previous => ({ right: previous.right + (right ? 1 : 0), total: previous.total + 1 }));
    setMood(current.phish ? "nope" : "chill");
    setLure(current.phish ? "mail" : "light");
  }

  function next() {
    setIndex(value => value + 1);
    setVerdict(null);
    setMood("suspicious");
    setLure("light");
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <p className="font-mono text-sm font-bold text-brand">PHISH//OUT mascot</p>
      <h1 className="mt-2 text-5xl font-bold tracking-tight">Meet Lumi</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Lumi is an angler fish, the original phisher. Anglers lure prey with a glowing bait. Lumi gave that up and now shows people how the trick works, so they never bite.
      </p>

      <section className="mt-6 overflow-hidden rounded-3xl bg-paper-raised">
        <div className="relative h-[clamp(280px,50vh,480px)] bg-[radial-gradient(ellipse_at_30%_20%,#fff4d1_0%,#ffd3e4_40%,#ff9fc7_100%)]">
          <div className="absolute inset-x-6 top-10 bottom-14 sm:inset-x-16"><Lumi mood={mood} lure={lure} /></div>
          <p className="absolute bottom-4 left-4 rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink" role="status">
            {lure === "mail" ? "See the lure? That’s what a phishing email looks like from the fish’s side." : MOODS.find(item => item.id === mood)?.line}
          </p>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="text-2xl font-bold">Moods</h2>
            <p className="mt-1 text-ink-soft">Lumi’s eye follows your pointer. Pick a mood, or show how the lure really works.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {MOODS.map(item => (
                <Button key={item.id} variant={mood === item.id ? "primary" : "secondary"} aria-pressed={mood === item.id} onClick={() => setMood(item.id)}>
                  {item.label}
                </Button>
              ))}
              <Button variant="dark" aria-pressed={lure === "mail"} onClick={() => setLure(lure === "mail" ? "light" : "mail")}>
                {lure === "mail" ? "Back to the light" : "Reveal the lure"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-paper-deep p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-2xl font-bold"><Icon icon={SearchIcon} size={22} className="text-brand" />Bait or not?</h2>
              <span className="font-mono text-sm text-ink-soft">{score.right}/{score.total}</span>
            </div>
            <div className="mt-3 rounded-xl bg-paper p-4">
              <p className="truncate font-mono text-xs text-ink-soft">From: {current.from}</p>
              <p className="mt-1 font-semibold">{current.subject}</p>
            </div>
            {verdict ? (
              <div className={cn("mt-3 flex gap-3 rounded-xl p-4 text-sm", verdict.right ? "bg-safe/15" : "bg-danger/15")}>
                <Icon icon={verdict.right ? CheckTickCircleIcon : AlertTriangleIcon} size={20} className={cn("mt-0.5 shrink-0", verdict.right ? "text-safe" : "text-danger")} />
                <p><b>{verdict.right ? "Good call." : "Lumi disagrees."}</b> {current.why}</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {verdict ? (
                <Button variant="primary" onClick={next}>Next message</Button>
              ) : (
                <>
                  <Button variant="raised" onClick={() => judge(false)}>Safe to open</Button>
                  <Button variant="primary" onClick={() => judge(true)}>It’s bait</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {FACTS.map(([title, body]) => (
          <li key={title} className="rounded-3xl bg-paper-raised p-6">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-ink-soft">{body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/games" className={buttonStyles()}>Play the missions</Link>
        <Link href="/" className={buttonStyles({ variant: "secondary" })}>Back home</Link>
      </div>
    </main>
  );
}
