"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/missions/icon";
import { MoonIcon, SunIcon } from "@pikaicons/core-free";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const isDarkNow = () => document.documentElement.classList.contains("dark");

/** True when the `.dark` class is on <html>. Always false on the server. */
export function useIsDark() {
  return useSyncExternalStore(subscribe, isDarkNow, () => false);
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
}

/**
 * Switches theme. Where the browser supports view transitions, the new theme
 * wipes in as a circle growing out of the button.
 */
function switchTheme(dark: boolean, origin: HTMLElement) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || still) {
    setTheme(dark);
    return;
  }

  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => {
    flushSync(() => setTheme(dark));
  });

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // Transition was skipped; the theme has already changed.
    });
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();

  // In development, Strict Mode's remount resets <html> to the classes React
  // knows about, dropping the one the inline script added. Put it back.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem("theme") === "dark";
      document.documentElement.classList.toggle("dark", saved);
    } catch {
      // Storage blocked: stay on the default theme.
    }
  }, []);

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      suppressHydrationWarning
      onClick={(event) => switchTheme(!dark, event.currentTarget)}
      className={cn(
        "depth relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper text-ink",
        "transition-[transform,box-shadow] duration-75",
        "active:depth-pressed active:translate-y-0.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      {/* Both icons are always rendered; the .dark class on <html> picks one in CSS,
          so the right icon shows from the first paint with no hydration flash. */}
      <Icon icon={SunIcon} size={20} strokeWidth={2} className="absolute rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none dark:-rotate-90 dark:scale-50 dark:opacity-0" />
      <Icon icon={MoonIcon} size={19} strokeWidth={2} className="absolute rotate-90 scale-50 opacity-0 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none dark:rotate-0 dark:scale-100 dark:opacity-100" />
    </button>
  );
}
