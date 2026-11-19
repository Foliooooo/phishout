/** Levels, badges and streak rules. Pure data, safe to import on the client. */

export type Level = "novice" | "expert";

/** Starter missions. Clearing all of them unlocks Expert. */
export const NOVICE_MISSIONS = ["crush-switch", "inbox-trap", "link-inspector", "spot-the-lookalike", "popup-panic", "refund-rush"] as const;

/** Harder missions, plus Endless mode, open once Novice is cleared. */
export const EXPERT_MISSIONS = ["double-trouble", "tick-tock", "whos-the-boss", "download-roulette", "header-hunt", "payload-autopsy"] as const;

/** A mission counts as cleared once a run scores at least this much. */
export const PASS_XP = 50;

export const LEVELS: Record<Level, { title: string; blurb: string }> = {
  novice: { title: "Novice", blurb: "The everyday tricks: sweet messages, fake senders, sketchy links, look-alike sites and pop-ups." },
  expert: { title: "Expert", blurb: "Pressure, authority, attachments and real forensic work in a terminal. Clear these for the certificate." },
};

export function levelOf(slug: string): Level {
  return (NOVICE_MISSIONS as readonly string[]).includes(slug) ? "novice" : "expert";
}

export type BadgeKind = "milestone" | "achievement" | "streak";

export type Badge = {
  id: string;
  kind: BadgeKind;
  title: string;
  description: string;
  /** Glyph drawn on the badge: a short mark, never an emoji. */
  mark: string;
};

export const BADGES: Badge[] = [
  { id: "first-catch", kind: "milestone", title: "First catch", description: "Clear your first mission.", mark: "01" },
  { id: "five-cleared", kind: "milestone", title: "Five down", description: "Clear five different missions.", mark: "05" },
  { id: "novice-graduate", kind: "milestone", title: "Novice graduate", description: "Clear every Novice mission and unlock Expert.", mark: "N" },
  { id: "expert", kind: "milestone", title: "Human firewall", description: "Clear every mission and earn the certificate.", mark: "E" },
  { id: "xp-500", kind: "milestone", title: "500 club", description: "Reach 500 XP across your best runs.", mark: "500" },
  { id: "xp-1000", kind: "milestone", title: "1000 club", description: "Reach 1,000 XP across your best runs.", mark: "1K" },

  { id: "perfect", kind: "achievement", title: "Perfect run", description: "Score 100 XP in a mission.", mark: "100" },
  { id: "sharp-eye", kind: "achievement", title: "Sharp eye", description: "Catch every clue in a mission without a single false flag.", mark: "◎" },
  { id: "no-coach", kind: "achievement", title: "No help needed", description: "Clear a mission without asking the coach.", mark: "0H" },
  { id: "comeback", kind: "achievement", title: "Comeback", description: "Fail a mission, then clear it on a later try.", mark: "↺" },
  { id: "terminal", kind: "achievement", title: "Terminal operator", description: "Clear a mission in the VM terminal.", mark: ">_" },
  { id: "endless", kind: "achievement", title: "Into the deep", description: "Finish an AI-generated Endless mission.", mark: "∞" },

  { id: "streak-3", kind: "streak", title: "Warming up", description: "Play on 3 days in a row.", mark: "3D" },
  { id: "streak-7", kind: "streak", title: "Week watch", description: "Play on 7 days in a row.", mark: "7D" },
  { id: "streak-14", kind: "streak", title: "Fortnight", description: "Play on 14 days in a row.", mark: "14D" },
];

export const BADGE_KINDS: Record<BadgeKind, string> = {
  milestone: "Milestones",
  achievement: "Achievements",
  streak: "Streaks",
};

/** Accounts with no limits: every level open, no rate limits, admin tools. */
export const SUPER_ADMINS = ["harshitkumar9030@gmail.com"];

export function isSuperAdmin(email: string | null | undefined) {
  return Boolean(email && SUPER_ADMINS.includes(email.trim().toLowerCase()));
}
