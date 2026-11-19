import type { GuideLine } from "@/components/lumi-guide";
import { endlessGame, games, getGame, learningFor, type Game } from "@/lib/games";
import { BADGES, LEVELS, NOVICE_MISSIONS, PASS_XP, levelOf } from "@/lib/levels";
import { canPlay, getProgress } from "@/lib/progress";
import { predictForPlayer } from "@/lib/prediction";

function list(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const intro: GuideLine = {
  text: "I’m Lumi. Anglers like me lure fish with a glowing bait. Phishers do the same thing to you, just with emails and links. I quit. Now I show people the trick.",
  lure: "mail",
};

/** What Lumi says to someone who isn’t signed in. */
export function guestLines(): GuideLine[] {
  const first = getGame("crush-switch") ?? games[0];
  return [
    intro,
    { text: `New here? Start with ${first.title}. ${first.blurb}`, href: `/games/${first.slug}`, cta: `Open ${first.title}` },
    { text: "Every mission is fake on purpose. Click the scary link, open the attachment, trust the stranger. Nothing here can hurt you, so go learn what it feels like.", href: "/games", cta: "See all missions", mood: "suspicious" },
    { text: `There are two levels. ${LEVELS.novice.title} has ${NOVICE_MISSIONS.length} starter missions; clear them all and ${LEVELS.expert.title} unlocks. Clear Expert too and you earn a certificate, with badges and streaks along the way.`, href: "/games", cta: "See the levels" },
    { text: "Sign in and I’ll remember what caught you, then pick the mission that trains your weakest spot.", href: "/sign-in", cta: "Sign in" },
  ];
}

/** What Lumi says to a signed-in player: level progress, weakest skill, badges and the certificate. */
export async function playerLines(userId: string, email?: string | null): Promise<GuideLine[]> {
  const [progress, { prediction }] = await Promise.all([getProgress(userId, email), predictForPlayer(userId)]);
  const noviceLeft = progress.novice.left.map(slug => getGame(slug)).filter(Boolean) as Game[];
  const expertLeft = progress.expert.left.map(slug => getGame(slug)).filter(Boolean) as Game[];
  const lines: GuideLine[] = [];

  if (progress.certified) {
    lines.push({ text: `You cleared both levels. You’re a certified Expert, and your certificate is ready to print or share.`, href: "/certificate", cta: "View certificate" });
    lines.push({ text: "Want more? Endless mode writes a brand-new inbox every time, so you can keep your eye sharp.", href: "/games/endless", cta: "Play Endless" });
  } else if (!progress.cleared.length) {
    const first = noviceLeft[0] ?? games[0];
    lines.push({ text: `Welcome aboard. You start at Novice: ${progress.novice.total} missions, ${PASS_XP}+ XP each to clear. ${first.title} is a good first catch.`, href: `/games/${first.slug}`, cta: `Open ${first.title}` });
  } else if (progress.level === "novice") {
    const next = noviceLeft[0];
    lines.push({ text: `You’re a Novice with ${progress.novice.done} of ${progress.novice.total} cleared. ${noviceLeft.length} more and Expert unlocks.${next ? ` Next up: ${next.title}.` : ""}`, href: next ? `/games/${next.slug}` : "/games", cta: next ? `Open ${next.title}` : "All missions" });
  } else {
    const next = expertLeft[0];
    lines.push({ text: `You’re at Expert level: ${progress.expert.done} of ${progress.expert.total} cleared. Finish them all for your certificate.${next ? ` Next up: ${next.title}.` : ""}`, href: next ? `/games/${next.slug}` : "/certificate", cta: next ? `Open ${next.title}` : "Certificate" });
  }

  const weakest = prediction?.skills.slice().sort((a, b) => b.missChance - a.missChance)[0];
  const target = prediction ? getGame(prediction.next) : undefined;
  if (weakest && target && canPlay(progress, target.slug)) {
    lines.push({
      text: `My read on you: you’re most likely to miss ${weakest.skill.toLowerCase()} signs (about ${Math.round(weakest.missChance * 100)}% of the time). ${target.title} trains exactly that.`,
      href: `/games/${target.slug}`,
      cta: `Train with ${target.title}`,
      mood: "suspicious",
    });
  }

  if (progress.streak.current > 0 && !progress.streak.playedToday) {
    lines.push({ text: `You’re on a ${progress.streak.current}-day streak. Finish a mission today to keep it alive.`, href: "/games", cta: "Pick a mission", mood: "suspicious" });
  } else if (progress.streak.current > 1) {
    lines.push({ text: `${progress.streak.current} days in a row. Keep it up: streak badges unlock at 3, 7 and 14 days.` });
  }

  const nextBadge = BADGES.find(badge => !progress.badges.some(earned => earned.id === badge.id));
  lines.push({
    text: `You have ${progress.badges.length} of ${BADGES.length} badges.${nextBadge ? ` Try for “${nextBadge.title}”: ${nextBadge.description}` : " That’s all of them."}`,
    href: "/scores",
    cta: "Scores & badges",
  });
  return lines;
}

/** What Lumi says on a mission’s page: what it teaches and how to approach it. */
export function gameLines(slug: string): GuideLine[] {
  const game = slug === endlessGame.slug ? endlessGame : getGame(slug);
  const learning = learningFor(slug);
  if (!game) return [];
  const index = games.findIndex(item => item.slug === slug);
  const next = index >= 0 ? games[(index + 1) % games.length] : games[0];
  const level = slug === "endless" ? "expert" : levelOf(slug);
  const lines: GuideLine[] = [
    { text: `${LEVELS[level].title} mission. ${game.title} trains ${(learning ? list(learning.skills) : game.skill).toLowerCase()}. ${game.objective}`, href: `/games/${slug}/play`, cta: `Play ${game.title}` },
  ];
  if (learning) {
    lines.push({ text: `The habit to leave with: ${learning.takeaways[0]}`, mood: "suspicious" });
    lines.push({ text: `Where you’ll meet this for real: ${learning.realWorld}`, lure: "mail" });
  }
  lines.push({ text: `${game.mode === "native" ? "Stuck? The Coach button gives you a hint without giving away the answer." : "Take your time: the answers are all in the evidence, so read before you guess."} When you’re done, ${next.title} is next.`, href: `/games/${next.slug}`, cta: `Next: ${next.title}` });
  return lines;
}
