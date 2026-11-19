"use client";

import { Icon } from "@/components/missions/icon";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, ArrowUpIcon } from "@pikaicons/core-free";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const control = "depth flex size-12 items-center justify-center rounded-full bg-ink text-paper transition-transform active:depth-pressed active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** The page one level up, used when there’s no in-app history to go back to. */
function parentOf(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/";
}

function Controls() {
  const pathname = usePathname();
  const router = useRouter();
  const still = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  // How many in-app pages sit behind this one in this tab, so Back never leaves the app.
  const depth = useRef(0);
  const last = useRef(pathname);
  const via = useRef<"push" | "back" | "replace">("push");

  useEffect(() => {
    // Only real route changes count (effects can run twice on mount in development).
    if (pathname === last.current) return;
    last.current = pathname;
    if (via.current === "back") depth.current = Math.max(0, depth.current - 1);
    else if (via.current === "push") depth.current += 1;
    via.current = "push";
  }, [pathname]);

  // The browser’s own back and forward buttons also move through history.
  useEffect(() => {
    const onPop = () => { via.current = "back"; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  function back() {
    if (depth.current > 0) {
      via.current = "back";
      router.back();
    } else {
      // Opened directly: go one level up without adding a history entry.
      via.current = "replace";
      router.replace(parentOf(pathname));
    }
  }

  const showBack = pathname !== "/";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-between px-4 sm:bottom-6 sm:px-6 print:hidden">
      <div>
        {showBack ? (
          <button type="button" onClick={back} aria-label="Go back" title="Back" className={cn(control, "pointer-events-auto")}>
            <Icon icon={ArrowLeftIcon} size={20} />
          </button>
        ) : null}
      </div>
      <AnimatePresence>
        {scrolled ? (
          <motion.button
            key="top"
            type="button"
            aria-label="Back to top"
            title="Back to top"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            onClick={() => window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" })}
            className={cn(control, "pointer-events-auto bg-brand text-on-brand")}
          >
            <Icon icon={ArrowUpIcon} size={20} />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Back (to the previous step) and back-to-top, the same on every page. */
export function PageControls() {
  return <Suspense fallback={null}><Controls /></Suspense>;
}
