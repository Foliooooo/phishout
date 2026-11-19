"use client";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

const TEAM = {
  name: "Codegenezz",
  members: [
    "Harshit Singh",
    "Swarnim Maindola",
    "Shivatmika Saroj",
    "Yash Sharma",
  ],
};

/** Blobs that squeeze out of the sheet's top edge. `left` is a percentage. */
const DROPS = [
  { left: 8, size: 64, rise: 14, delay: 0.1 },
  { left: 30, size: 92, rise: 26, delay: 0.02 },
  { left: 56, size: 72, rise: 18, delay: 0.14 },
  { left: 76, size: 56, rise: 10, delay: 0.06 },
];

const SHEET_TOP = 40;
const noop = () => () => {};
const ooze = { type: "spring", stiffness: 230, damping: 15, mass: 0.9 } as const;

/**
 * "Made by Codegenezz" button. Tapping it oozes a team sheet up from the
 * bottom of the screen: the pink shapes sit under an SVG goo filter so they
 * merge like liquid, and the text rides on top unfiltered.
 */
export function TeamCredit({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const still = useReducedMotion();
  // The popup is portalled to <body>, which only exists in the browser.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const gooId = useId();
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const button = trigger.current;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    close.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        event.preventDefault();
        close.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previousOverflow;
      button?.focus({ preventScroll: true });
    };
  }, [open]);

  const leave = { duration: 0.28, ease: "easeIn" } as const;
  const hidden = still ? { opacity: 0 } : { y: "115%" };
  const gone = { ...hidden, transition: leave };
  const shown = still ? { opacity: 1 } : { y: 0 };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(buttonStyles({ variant: "dark", size: "lg" }), className)}
      >
        Made by {TEAM.name}
      </button>

      <svg aria-hidden className="absolute size-0">
        <defs>
          <filter id={gooId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
            />
          </filter>
        </defs>
      </svg>

      {mounted &&
        createPortal(
        <AnimatePresence>
          {open && (
          <div className="fixed inset-x-0 top-0 z-[60] flex h-dvh items-end justify-center overflow-hidden overscroll-none">
            <motion.button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-on-brand/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            <div className="relative w-full max-w-md px-3 pt-6">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-3 inset-y-0"
                style={{ filter: `url(#${gooId})` }}
              >
                <motion.div
                  className="absolute inset-x-0 -bottom-12 rounded-t-[2.5rem] bg-brand"
                  style={{ top: SHEET_TOP }}
                  initial={hidden}
                  animate={shown}
                  exit={gone}
                  transition={ooze}
                />
                {!still &&
                  DROPS.map((drop) => (
                    <motion.span
                      key={drop.left}
                      className="absolute rounded-full bg-brand"
                      style={{
                        left: `${drop.left}%`,
                        top: SHEET_TOP,
                        width: drop.size,
                        height: drop.size,
                      }}
                      initial={{ y: 420, scale: 0.5 }}
                      animate={{ y: -drop.rise, scale: 1 }}
                      exit={{ y: 420, scale: 0.5, transition: leave }}
                      transition={{
                        ...ooze,
                        stiffness: 170,
                        damping: 11,
                        delay: drop.delay,
                      }}
                    />
                  ))}
              </div>

              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-on-brand"
                style={{ paddingTop: SHEET_TOP + 44 }}
                initial={hidden}
                animate={shown}
                exit={gone}
                transition={ooze}
              >
                <p className="text-sm font-bold tracking-wide uppercase">
                  Made by
                </p>
                <h2
                  id={titleId}
                  className="font-mono text-4xl font-bold tracking-tighter sm:text-5xl"
                >
                  {TEAM.name}
                </h2>
                <p className="mt-1 text-base font-semibold">
                  Team of {TEAM.members.length}
                </p>
                <ol className="mt-5 grid gap-2">
                  {TEAM.members.map((member, index) => (
                    <motion.li
                      key={member}
                      className="flex items-center gap-3 rounded-2xl bg-paper-raised px-4 py-3 text-lg font-bold text-ink"
                      initial={still ? false : { y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 20,
                        delay: 0.18 + index * 0.06,
                      }}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-sm">
                        {index + 1}
                      </span>
                      {member}
                    </motion.li>
                  ))}
                </ol>
                <button
                  ref={close}
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonStyles({ variant: "dark" }),
                    "mt-6 w-full bg-on-brand text-brand",
                  )}
                >
                  Nice one
                </button>
              </motion.div>
            </div>
          </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
