"use client";

import { Scales } from "@/components/ui/scales";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { useRef } from "react";

/** A strip of words that slides sideways as the page scrolls. */
export function Ticker({
  words,
  className,
}: {
  words: string[];
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const row = [...words, ...words, ...words, ...words];

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-row]",
          { xPercent: 0 },
          {
            xPercent: -40,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      aria-hidden
      className={cn("relative overflow-hidden py-5", className)}
    >
      <Scales orientation="vertical" size={8} />
      <div
        data-row
        className="relative flex w-max items-center gap-3 will-change-transform"
      >
        {row.map((word, index) => (
          <span
            key={index}
            className={cn(
              "rounded-full px-5 py-2 font-mono text-lg font-bold tracking-tight uppercase sm:text-2xl",
              index % 2 === 0 ? "bg-ink text-paper" : "bg-brand text-on-brand",
            )}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
