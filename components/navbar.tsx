import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { AccountMenu, MobileMenu, NavTabs, type NavAccount } from "@/components/nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { playerAlias } from "@/lib/leaderboard";
import { avatarUrl, getProfile } from "@/lib/profiles";
import { cn } from "@/lib/utils";

const links = [
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/party", label: "Party" },
  { href: "/architecture", label: "AI" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono font-bold tracking-tight", className)}>
      PHISH<span className="text-brand">{"//"}</span>OUT
    </span>
  );
}

async function Account() {
  await connection();
  const session = await auth();
  let account: NavAccount = null;
  if (session?.user.id) {
    const profile = await getProfile(session.user.id).catch(() => null);
    account = { name: profile?.displayName ?? playerAlias(session.user.id), photo: avatarUrl(profile) };
  }
  return (
    <>
      <AccountMenu account={account} />
      <MobileMenu account={account} />
    </>
  );
}

export function Navbar({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-4 z-50 mt-5 mb-4 px-3 sm:top-5 sm:mt-7 sm:mb-6 sm:px-4", className)}>
      <div className="relative mx-auto max-w-6xl">
        <nav
          aria-label="Main"
          className="relative flex min-h-14 w-full items-center justify-between gap-2 rounded-[1.75rem] bg-ink py-1.5 pr-2 pl-4 text-paper sm:min-h-16 sm:pr-3 sm:pl-6 md:grid md:grid-cols-[1fr_auto_1fr]"
        >
          <Link href="/" className="w-fit rounded-full text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:text-lg">
            <Logo />
          </Link>
          {/* The tabs read the current path, so they render inside Suspense with plain links as the fallback. */}
          <Suspense fallback={<div className="hidden items-center md:flex">{links.map(link => <Link key={link.href} href={link.href} className="inline-flex h-11 shrink-0 items-center rounded-full px-3 text-sm font-bold whitespace-nowrap text-paper/70 lg:px-4">{link.label}</Link>)}</div>}>
            <NavTabs links={links} />
          </Suspense>
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle className="size-11 shrink-0 bg-paper/10 text-paper hover:bg-paper/20" />
            <Suspense fallback={<span className="size-11" />}>
              <Account />
            </Suspense>
          </div>
        </nav>
      </div>
    </header>
  );
}
