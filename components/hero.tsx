"use client";

import { ShaderCanvas } from "@/components/shader-canvas";
import { Button, buttonStyles } from "@/components/ui/button";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

const TITLE = ["P", "H", "I", "S", "H", "/", "/", "O", "U", "T"];

export function Hero({ slugs }: { slugs: string[] }) {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();

  const surprise = () => {
    const slug = slugs[Math.floor(Math.random() * slugs.length)];
    router.push(`/games/${slug}`);
  };

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-char]", {
          yPercent: 120,
          rotate: 14,
          opacity: 0,
          duration: 0.7,
          stagger: 0.05,
          ease: "back.out(1.8)",
        });
        gsap.from("[data-rise]", {
          y: 24,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          delay: 0.45,
          ease: "power3.out",
        });
        // The shader panel shrinks away as the grid scrolls in.
        gsap.to("[data-panel]", {
          scale: 0.92,
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
        gsap.to("[data-title]", {
          yPercent: -30,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="px-3 pt-6 sm:px-4">
      <div
        data-panel
        className="relative mx-auto flex min-h-[72svh] w-full max-w-6xl flex-col items-center justify-center overflow-hidden rounded-[2.5rem] bg-brand-soft px-6 py-20 text-center will-change-transform"
      >
        <ShaderCanvas />
        <div data-title className="relative z-10 flex flex-col items-center">
          <h1
            aria-label="PHISH OUT"
            className="overflow-hidden pb-2 font-mono text-[clamp(3rem,13vw,10rem)] leading-none font-bold tracking-tighter text-ink"
          >
            {TITLE.map((char, index) => (
              <span
                key={index}
                data-char
                aria-hidden
                className={cn(
                  "inline-block will-change-transform",
                  char === "/" && "text-paper-raised",
                )}
              >
                {char}
              </span>
            ))}
          </h1>
          <p
            data-rise
            className="mt-4 rounded-full bg-paper-raised px-5 py-2 text-base font-semibold text-ink sm:text-lg"
          >
            Get phished on purpose, in a browser that can’t hurt you.
          </p>
          <div
            data-rise
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/games"
              className={buttonStyles({ size: "lg", variant: "dark" })}
            >
              Pick a game
            </Link>
            <Button size="lg" variant="raised" onClick={surprise}>
              Surprise me
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
