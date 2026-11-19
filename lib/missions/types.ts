/** Shapes the mission API sends to the browser. Answers stay on the server. */

export type SiteRow = [from: string, title: string, when: string, body: string];

export type PublicClue = { field: string; value: string; tagged: boolean };

export type ReviewClue = { field: string; value: string; explanation: string | null; tagged: boolean };

export type ReviewItem = {
  subject: string;
  action: string;
  consequence: string;
  lesson: string;
  correct: boolean;
  inspected: boolean;
  /** False when the run ended (out of lives) before this situation. */
  reached: boolean;
  points: number;
  decisionPoints: number;
  evidencePoints: number;
  clues: ReviewClue[];
};

export type PublicScene = {
  surface: string;
  address: string;
  sender: string;
  subject: string;
  message: string;
  check: string;
  entry: string | null;
  actions: string[];
  inspected: boolean;
  evidence: string | null;
  clues: PublicClue[] | null;
};

export type MissionSite = {
  name: string;
  kind: string;
  section: string;
  account: string;
  rows: SiteRow[];
  task: string;
  intro: string;
  address: string;
};

export type SceneMissionView = {
  kind: "scenes";
  slug: string;
  step: number;
  total: number;
  started: boolean;
  site: MissionSite;
  xp: number;
  feedback: ReviewItem | null;
  complete: boolean;
  correct: boolean | null;
  review: ReviewItem[] | null;
  scene: PublicScene | null;
  arcade: ArcadeView;
};

export type ArcadeView = {
  score: number;
  combo: number;
  best: number;
  lives: number;
  livesMax: number;
  /** The current situation is the last, harder one. */
  boss: boolean;
  /** Soft clock for the current situation, in seconds (0 when not playing). */
  limit: number;
  /** Seconds already on the clock, measured by the server. */
  elapsed: number | null;
  lines: { base: number; combo: number; time: number; boss: boolean; total: number }[];
  /** The run ended early because the player ran out of lives. */
  hooked: boolean;
};

export type ChatView = {
  kind: "chat";
  slug: "crush-switch";
  messages: number;
  replies: string[];
  notice: boolean;
  mailOpened: boolean;
  inspected: boolean;
  linkOpened: boolean;
  dismissed: boolean;
  confirmed: boolean;
  timeline: string[];
  complete: boolean;
  correct: boolean | null;
  xp: number;
  breakdown: { label: string; points: number }[];
  ranked: boolean;
};

export type MissionView = SceneMissionView | ChatView;

export type RunResponse = { runId: string; view: MissionView; saved?: { xp: number; correct: boolean } | null };

export type MissionReport = {
  headline: string;
  skills: { skill: string; rating: number; note: string }[];
  strengths: string[];
  focus: string[];
  next: string;
};
