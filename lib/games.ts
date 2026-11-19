export type GameTone = "brand" | "soft" | "raised" | "deep" | "ink" | "caution";

export interface Game {
  slug: string;
  title: string;
  blurb: string;
  /** Big typographic mark shown as the card art. */
  glyph: string;
  /** The skill the game trains. */
  skill: string;
  tone: GameTone;
  scales: "horizontal" | "vertical" | "diagonal";
  /** Fictional address shown in the exercise. */
  startUrl: string;
  playable: boolean;
  /**
   * "native" missions run directly in the player's tab. "sandbox" missions
   * stream a disposable Chromium from the VM, because they depend on real
   * browser behaviour; they fall back to the native version when the VM is off.
   */
  mode: "native" | "sandbox" | "terminal";
  objective: string;
  instructions: readonly [string, string, string];
}

export const games: Game[] = [
  {
    slug: "inbox-trap",
    title: "Inbox Trap",
    blurb: "Check your campus inbox. A real ticket update and an unexpected internship offer are waiting.",
    glyph: "@",
    skill: "The full mission",
    tone: "brand",
    scales: "diagonal",
    startUrl: "mail.novabyte.example/inbox",
    playable: true,
    mode: "native",
    objective: "Work through campus mail and separate legitimate updates from requests that need verification.",
    instructions: [
      "Read the ordinary mail first, then sync the inbox to see what’s new.",
      "Hover over links to see where they lead before following them.",
      "Tag suspicious details, then report, verify, archive, or proceed as appropriate.",
    ],
  },
  {
    slug: "link-inspector",
    title: "Link Inspector",
    blurb: "Hover it. Read the status bar. Then decide if you dare click.",
    glyph: "//",
    skill: "Links",
    tone: "raised",
    scales: "vertical",
    startUrl: "news.dailybyte.example/offers",
    playable: true,
    mode: "native",
    objective: "Decide whether the offer link leads to the site it claims to represent.",
    instructions: [
      "Read the offer and note the site it claims to come from.",
      "Preview the destination before choosing which page to open.",
      "Compare the destination domain with the expected domain before making your call.",
    ],
  },
  {
    slug: "spot-the-lookalike",
    title: "Spot the Lookalike",
    blurb: "novabyte or n0vabyte? The address bar knows. Do you?",
    glyph: "0o",
    skill: "Address bar",
    tone: "ink",
    scales: "diagonal",
    startUrl: "novabyte.example/files",
    playable: true,
    mode: "sandbox",
    objective: "Catch a lookalike domain by reading the address bar.",
    instructions: [
      "Read the domain in the sandbox browser’s address bar.",
      "Bring up the saved address or directory entry when you need to compare.",
      "Decide whether you would trust the page with your account.",
    ],
  },
  {
    slug: "double-trouble",
    title: "Double Trouble",
    blurb: "Compare two sign-in destinations and pick the genuine one.",
    glyph: "?",
    skill: "Fake logins",
    tone: "soft",
    scales: "horizontal",
    startUrl: "projects.novabyte.example/dashboard",
    playable: true,
    mode: "native",
    objective: "Compare two sign-in destinations and identify the genuine one.",
    instructions: [
      "Show the details to reveal both sign-in destinations.",
      "Check which destination belongs to the expected Novabyte domain.",
      "Choose the genuine page without entering any real credentials.",
    ],
  },
  {
    slug: "tick-tock",
    title: "Tick Tock",
    blurb: "\u201cYour account closes in 10 minutes.\u201d Says who? Beat the fake countdown.",
    glyph: "24h",
    skill: "Urgency",
    tone: "caution",
    scales: "diagonal",
    startUrl: "storage.novabyte.example/files",
    playable: true,
    mode: "native",
    objective: "Recognize when a countdown is pressuring you to act before checking.",
    instructions: [
      "Read the warning and identify what it wants you to do.",
      "Inspect the destination and verify where the warning came from.",
      "Decide how to respond before giving the prompt any information.",
    ],
  },
  {
    slug: "download-roulette",
    title: "Download Roulette",
    blurb: "invoice.pdf.exe wants in. It\u2019s a sandbox, so go on, see what happens.",
    glyph: ".exe",
    skill: "Downloads",
    tone: "deep",
    scales: "vertical",
    startUrl: "files.quickshare.example/invoice",
    playable: true,
    mode: "native",
    objective: "Work out what the browser would actually download from the file link.",
    instructions: [
      "Read the filename all the way to its final extension.",
      "Compare the file type with what the page claims to offer.",
      "Decide whether you would keep or discard the download.",
    ],
  },
  {
    slug: "whos-the-boss",
    title: "Who\u2019s the Boss?",
    blurb: "Finance needs a vendor paid before the next shipment. Then the bank details change.",
    glyph: "CEO",
    skill: "Authority",
    tone: "soft",
    scales: "diagonal",
    startUrl: "chat.novabyte.example/dm",
    playable: true,
    mode: "native",
    objective: "Check an urgent request that appears to come from someone in authority.",
    instructions: [
      "Open the chat and inspect who sent the message.",
      "Look for unusual requests, secrecy, or pressure to act quickly.",
      "Choose how to verify the request through a separate channel.",
    ],
  },
  {
    slug: "popup-panic",
    title: "Pop-up Panic",
    blurb: "\u201c5 viruses found!\u201d Allow, block or close the tab? Choose fast.",
    glyph: "!!",
    skill: "Pop-ups",
    tone: "raised",
    scales: "horizontal",
    startUrl: "free-movies.example/watch",
    playable: true,
    mode: "sandbox",
    objective: "Decide whether a pop-up really needs the permission it asks for.",
    instructions: [
      "Check which site triggered the prompt and what it is requesting.",
      "Compare that permission with what you came to the site to do.",
      "Choose whether to allow it, block it, or close the tab.",
    ],
  },
  {
    slug: "crush-switch",
    title: "Crush Switch",
    blurb: "A conversation on Fakestagram takes a turn when your chat suddenly says you’re signed out.",
    glyph: "<3",
    skill: "Impersonation",
    tone: "soft",
    scales: "diagonal",
    startUrl: "fakestagram.example/direct/inbox",
    playable: true,
    mode: "native",
    objective: "Trace a fake logout from the chat through the inbox to the signup page.",
    instructions: [
      "Type your own replies to Riley in Fakestagram Direct.",
      "When the session notice arrives, read the email and compare the addresses in your browser tabs.",
      "Decide what you trust before submitting the practice details.",
    ],
  },
  {
    slug: "refund-rush",
    title: "Refund Rush",
    blurb: "“I sent you money by mistake, please send it back.” Did anything actually arrive?",
    glyph: "₹?",
    skill: "Payments",
    tone: "caution",
    scales: "vertical",
    startUrl: "pay.paypocket.example/home",
    playable: true,
    mode: "native",
    objective: "Handle a “wrong transfer” refund request without losing money.",
    instructions: [
      "Open the SMS and the messages from the stranger who says they paid you by mistake.",
      "Check your own balance and the details of any request before you act.",
      "Decide whether to send, approve, decline or report.",
    ],
  },
  {
    slug: "header-hunt",
    title: "Header Hunt",
    blurb: "Three raw emails, a real shell and a few minutes. Grep your way to the phish.",
    glyph: ">_",
    skill: "Email forensics",
    tone: "ink",
    scales: "horizontal",
    startUrl: "/case/header-hunt",
    playable: true,
    mode: "terminal",
    objective: "Use a real Linux terminal on the VM to read raw email headers and bodies and work out which messages lie.",
    instructions: [
      "List the inbox folder and open the .eml files with cat or less.",
      "Check Authentication-Results, Reply-To and Return-Path, and decode hidden bodies with base64 -d.",
      "Type your findings into the case panel. Answers are checked on the server.",
    ],
  },
  {
    slug: "payload-autopsy",
    title: "Payload Autopsy",
    blurb: "invoice.pdf isn’t a PDF. Prove it with file, strings, unzip and sha256sum.",
    glyph: "0x",
    skill: "File forensics",
    tone: "deep",
    scales: "vertical",
    startUrl: "/case/payload-autopsy",
    playable: true,
    mode: "terminal",
    objective: "Triage suspicious downloads safely in a disposable, offline terminal without ever running them.",
    instructions: [
      "Use file to find each download’s real type, whatever its extension says.",
      "Look inside with strings and unzip -l, and hash everything with sha256sum.",
      "Compare against blocklist.txt and answer the case questions.",
    ],
  },
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}


export function getGameDestination(destination: string | null) {
  if (destination === "/scores" || destination === "/leaderboard") return destination;
  const match = destination?.match(/^\/games\/([a-z-]+)\/play$/);
  if (match && getAnyGame(match[1])) return destination!;
  const slug = destination?.startsWith("/games/") ? destination.slice(7) : "";
  return getAnyGame(slug) ? `/games/${slug}` : "/games";
}

/** Gemini-generated missions. Not part of the ranked catalog. */
export const endlessGame: Game = {
  slug: "endless",
  title: "Endless mode",
  blurb: "A brand-new inbox every time, written by AI and checked before you play it.",
  glyph: "∞",
  skill: "Everything",
  tone: "ink",
  scales: "diagonal",
  startUrl: "mail.novabyte.example/inbox",
  playable: true,
  mode: "native",
  objective: "Sort a freshly generated inbox: one email is genuine, the others are phishing.",
  instructions: [
    "Sync the inbox and open each new email as it arrives.",
    "Check the headers and links, then flag what looks wrong.",
    "Decide what to do. Not everything is a trap.",
  ],
};

/** Any playable mission, including Endless mode. */
export function getAnyGame(slug: string) {
  return slug === endlessGame.slug ? endlessGame : getGame(slug);
}

/** What each mission teaches: shown on its page and in its briefing. */
export type GameLearning = {
  /** Skills it trains (the same seven the prediction model tracks). */
  skills: string[];
  /** Habits the player should leave with. */
  takeaways: [string, string, string];
  /** Where this shows up in real life. */
  realWorld: string;
};

const LEARNING: Record<string, GameLearning> = {
  "inbox-trap": {
    skills: ["Sender", "Links", "Urgency", "Requests"],
    takeaways: [
      "Read the real sender address and Reply-To, not just the display name.",
      "Hover a link and read its destination before you click.",
      "Verify unexpected offers through a channel you already trust, and never pay to get a job.",
    ],
    realWorld: "Fake internship and job offers, “verify your account” emails and requests to forward login codes.",
  },
  "link-inspector": {
    skills: ["Links", "Trust"],
    takeaways: [
      "The text of a link and where it goes can be completely different.",
      "Read a domain from right to left: the part just before the last dot owns the page.",
      "When in doubt, use your own bookmark or type the address yourself.",
    ],
    realWorld: "Reward, coupon and “claim your points” links in newsletters, texts and social posts.",
  },
  "spot-the-lookalike": {
    skills: ["Links", "Trust"],
    takeaways: [
      "Lookalike domains swap characters (0 for o, rn for m) or bolt a real name onto a different domain.",
      "A padlock means the connection is encrypted, not that the site is genuine.",
      "Compare the address bar with a saved bookmark or your company directory.",
    ],
    realWorld: "Fake sign-in pages for work accounts, travel bookings and help desks.",
  },
  "double-trouble": {
    skills: ["Links", "Requests", "Trust"],
    takeaways: [
      "Put a suspicious sign-in page side by side with the one you know.",
      "If your password manager won’t autofill, ask yourself why before typing anything.",
      "Deny sign-in approvals you didn’t start, even if they keep coming.",
    ],
    realWorld: "Shared-document lures, session “restore” pages and multi-factor fatigue attacks.",
  },
  "tick-tock": {
    skills: ["Urgency", "Requests"],
    takeaways: [
      "Countdowns and deadlines are there to stop you thinking. Slow down on purpose.",
      "Check the service’s own status page or calendar instead of the message.",
      "A login code is a key to your account: never share it, however urgent the request.",
    ],
    realWorld: "“Your storage is full”, “account suspended in 24 hours” and fake follow-up support messages.",
  },
  "download-roulette": {
    skills: ["Attachments", "Requests"],
    takeaways: [
      "Read a file name all the way to the last extension: invoice.pdf.exe is a program.",
      "Never click “Enable content” on a document you didn’t expect.",
      "Ask for files through the usual portal, and open expected PDFs in the browser viewer.",
    ],
    realWorld: "Fake invoices, macro-enabled spreadsheets and “updated payment details” attachments.",
  },
  "whos-the-boss": {
    skills: ["Authority", "Requests", "Sender"],
    takeaways: [
      "A familiar name in chat isn’t proof of identity: check their directory card.",
      "Bank-detail changes need the official process, even when the boss is in a hurry.",
      "Voice notes and approval records can be faked. Call back on a number you already have.",
    ],
    realWorld: "CEO fraud, invoice redirection and gift-card requests over chat or voice.",
  },
  "popup-panic": {
    skills: ["Requests", "Trust"],
    takeaways: [
      "Match every permission to what you came to do: a video doesn’t need notifications.",
      "Sharing your whole screen shares everything on it. Share a single tab or window instead.",
      "“Virus found” pop-ups on a website are adverts. Close the tab.",
    ],
    realWorld: "Notification spam, fake virus alerts and screen-sharing scams on calls.",
  },
  "crush-switch": {
    skills: ["Trust", "Links"],
    takeaways: [
      "A “you’ve been signed out” overlay doesn’t mean you were. Check the original tab.",
      "Compare the domain in a recovery email with the real one before you click.",
      "Report impersonation through the app you already trust, not the link you were sent.",
    ],
    realWorld: "Romance scams, fake account-recovery emails and session-hijack lures on social apps.",
  },
  "refund-rush": {
    skills: ["Sender", "Requests", "Urgency", "Authority"],
    takeaways: [
      "Trust the balance in your own payments app, never an SMS or a screenshot saying money arrived.",
      "You never enter a UPI PIN to receive money. A collect request takes money out.",
      "If a stranger’s money really lands, don’t move it yourself: tell your bank, and report pressure calls to 1930.",
    ],
    realWorld: "“Sent to the wrong number” UPI scams, fake credit SMS, refund collect requests and fake police calls.",
  },
  "header-hunt": {
    skills: ["Sender", "Links", "Trust"],
    takeaways: [
      "Authentication-Results shows whether SPF and DKIM passed for the sending domain.",
      "Reply-To and Return-Path reveal where your answer really goes.",
      "Encoded email bodies can hide links. base64 -d shows what the HTML really says.",
    ],
    realWorld: "The first checks a security analyst runs on a reported phishing email.",
  },
  "payload-autopsy": {
    skills: ["Attachments", "Links"],
    takeaways: [
      "file reads the bytes, so it can’t be fooled by an extension.",
      "Office documents are zip files. Look inside before you open them.",
      "A SHA-256 hash identifies a file exactly, however it’s renamed.",
    ],
    realWorld: "Safe triage of suspicious downloads before anyone double-clicks them.",
  },
  endless: {
    skills: ["Sender", "Links", "Urgency", "Requests", "Trust"],
    takeaways: [
      "Apply every habit at once on emails you’ve never seen before.",
      "Not every email is an attack: tell genuine mail from phishing.",
      "Every run is new, so you can’t memorise the answers. You build the instinct instead.",
    ],
    realWorld: "A normal working day: a real inbox with real mail mixed in with the traps.",
  },
};

export function learningFor(slug: string): GameLearning | null {
  return LEARNING[slug] ?? null;
}
