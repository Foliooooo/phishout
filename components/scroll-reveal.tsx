"use client";

import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import React, { useRef } from "react";

/**
 * Pops every descendant marked `data-reveal` into place as it scrolls into
 * view, staggered per row. Works around server-rendered children.
 */
export function ScrollReveal({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const items = gsap.utils.toArray<HTMLElement>(
          "[data-reveal]",
          ref.current,
        );
        gsap.set(items, { y: 48, opacity: 0, scale: 0.94 });
        ScrollTrigger.batch(items, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.6,
              stagger: 0.07,
              ease: "back.out(1.6)",
              overwrite: true,
            }),
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
