"use client";

import { leaveAccount } from "@/app/account-actions";
import { Icon } from "@/components/missions/icon";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BurgerMenuThreeIcon, ChevronDownIcon, AwardMedalIcon, GraphBarLineIcon, LogOutRightIcon, MultipleCrossCancelIcon, PencilEditIcon, UserIcon,
} from "@pikaicons/core-free";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavAccount = { name: string; photo: string | null } | null;

const MAIN = [
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/party", label: "Party" },
  { href: "/impact", label: "Impact" },
  { href: "/for-teams", label: "For schools and teams" },
  { href: "/architecture", label: "How the AI works" },
];

function Face({ account, size = 32 }: { account: NonNullable<NavAccount>; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper/15 text-paper" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- user upload served from local storage */}
      {account.photo ? <img src={account.photo} alt="" className="size-full object-cover" /> : <Icon icon={UserIcon} size={Math.round(size * 0.55)} />}
    </span>
  );
}

/** Closes a popover on outside click, Escape, or navigation. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const last = useRef(pathname);
  useEffect(() => {
    if (last.current !== pathname) {
      last.current = pathname;
      close();
    }
  }, [pathname, close]);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) close(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

const menuItem = "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-ink hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-ink";

/** Desktop: the account button and its dropdown. */
export function AccountMenu({ account }: { account: NavAccount }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, close, root);

  if (!account) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Link href="/sign-in" className="inline-flex h-11 items-center rounded-full px-3 text-sm font-bold text-paper/85 hover:bg-paper/10 hover:text-paper">Sign in</Link>
        <Link href="/sign-up" className={cn(buttonStyles(), "h-11 rounded-full px-5 text-sm focus-visible:outline-brand")}>Sign up</Link>
      </div>
    );
  }

  return (
    <div ref={root} className="relative hidden md:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="flex h-11 items-center gap-2 rounded-full bg-paper/10 py-1 pr-3 pl-1 text-sm font-bold text-paper hover:bg-paper/20 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Face account={account} size={36} />
        <span className="hidden max-w-32 truncate lg:inline">{account.name}</span>
        <Icon icon={ChevronDownIcon} size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-paper-raised p-2 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            <Link role="menuitem" href="/scores" className={menuItem} onClick={close}><Icon icon={GraphBarLineIcon} size={18} />Scores &amp; badges</Link>
            <Link role="menuitem" href="/certificate" className={menuItem} onClick={close}><Icon icon={AwardMedalIcon} size={18} />Certificate</Link>
            <Link role="menuitem" href="/profile" className={menuItem} onClick={close}><Icon icon={PencilEditIcon} size={18} />Edit profile</Link>
            <form action={leaveAccount} className="mt-1 border-t border-paper-deep pt-1">
              <button role="menuitem" type="submit" className={cn(menuItem, "w-full")}><Icon icon={LogOutRightIcon} size={18} />Sign out</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Mobile: a hamburger that opens a full-width panel under the bar. */
export function MobileMenu({ account }: { account: NavAccount }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, close, root);

  return (
    <div ref={root} className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(value => !value)}
        className="flex size-11 items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Icon icon={open ? MultipleCrossCancelIcon : BurgerMenuThreeIcon} size={20} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Menu"
            className="absolute inset-x-0 top-full mt-2 rounded-[1.75rem] bg-paper-raised p-3 text-ink shadow-[0_16px_40px_rgba(0,0,0,0.2)] ring-1 ring-black/5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            {account && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-ink p-3 text-paper">
                <Face account={account} size={40} />
                <span className="truncate font-bold">{account.name}</span>
              </div>
            )}
            {MAIN.map(link => <Link key={link.href} href={link.href} className={menuItem} onClick={close}>{link.label}</Link>)}
            {account ? (
              <>
                <Link href="/scores" className={menuItem} onClick={close}><Icon icon={GraphBarLineIcon} size={18} />Scores &amp; badges</Link>
                <Link href="/certificate" className={menuItem} onClick={close}><Icon icon={AwardMedalIcon} size={18} />Certificate</Link>
                <Link href="/profile" className={menuItem} onClick={close}><Icon icon={PencilEditIcon} size={18} />Edit profile</Link>
                <form action={leaveAccount} className="mt-1 border-t border-paper-deep pt-1">
                  <button type="submit" className={cn(menuItem, "w-full")}><Icon icon={LogOutRightIcon} size={18} />Sign out</button>
                </form>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-paper-deep pt-3">
                <Link href="/sign-in" className={buttonStyles({ variant: "secondary" })} onClick={close}>Sign in</Link>
                <Link href="/sign-up" className={buttonStyles()} onClick={close}>Sign up</Link>
              </div>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Desktop tabs: a pill slides between links as you hover and as the route changes. */
export function NavTabs({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const current = links.find(link => pathname === link.href || pathname.startsWith(`${link.href}/`))?.href ?? null;
  const highlighted = hovered ?? current;
  return (
    <div className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
      {links.map(link => {
        const active = link.href === current;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => setHovered(link.href)}
            onFocus={() => setHovered(link.href)}
            onBlur={() => setHovered(null)}
            className={cn(
              "relative inline-flex h-11 shrink-0 items-center rounded-full px-3 text-sm font-bold whitespace-nowrap transition-colors lg:px-4",
              active ? "text-paper" : "text-paper/70 hover:text-paper",
              "focus-visible:outline-2 focus-visible:outline-brand",
            )}
          >
            {highlighted === link.href && (
              <motion.span
                layoutId="nav-pill"
                aria-hidden
                className={cn("absolute inset-0 rounded-full", active ? "bg-paper/15" : "bg-paper/10")}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{link.label}</span>
            {active && <span aria-hidden className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand" />}
          </Link>
        );
      })}
    </div>
  );
}
