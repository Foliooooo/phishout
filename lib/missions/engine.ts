import scenesData from "./scenes.json";
import sitesData from "./sites.json";
import { scoringVersion } from "@/lib/game-scoring";
import type { MissionView, PublicClue, ReviewItem, SiteRow } from "./types";

/**
 * Server-owned mission rules, ported 1:1 from the VM fixture
 * (sandbox/browser/mission.py) so XP and learning data stay comparable with
 * runs that were played in the disposable Chromium sandboxes.
 */

export type Action = { label: string; safe: boolean; points?: number; consequence: string };
export type Clue = { field: string; value: string; explanation: string | null };
export type Scene = {
  surface: string; address: string; sender: string; entry?: string | null;
  subject: string; message: string; check: string; evidence: string;
  actions: Action[]; lesson: string; clues: Clue[];
};
export type Site = {
  name: string; kind: string; section: string; account: string;
  rows: SiteRow[]; task: string; intro: string; address: string;
};

const scenes = scenesData as Record<string, Scene[]>;
const sites = sitesData as unknown as Record<string, Site>;

export const sceneMissions = Object.keys(scenes);

export type MissionState = {
  started: boolean;
  checked: boolean;
  tags: number[];
  /** [action index, inspected, tagged clue indexes] per finished scene. Action -1: not reached (out of lives). */
  choices: [number, boolean, number[]][];
  /** Server time (ms) the current situation’s clock started. */
  clockAt?: number;
  /** Seconds taken on each finished situation (null: clock never started). */
  times?: (number | null)[];
};

export const newMissionState = (): MissionState => ({ started: false, checked: false, tags: [], choices: [], times: [] });

/* ------------------------------------------------------------------ */
/* Arcade layer: lives, combo, a soft clock and a boss round.          */
/* Ranked XP is unchanged; the arcade score sits on top of it.         */
/* ------------------------------------------------------------------ */

export const LIVES = 2;
export const timeLimit = (step: number, total: number) => (step === total - 1 ? 30 : 45);
const NOT_REACHED = -1;

export type ArcadeLine = { base: number; combo: number; time: number; boss: boolean; total: number };

/** Arcade score for the finished situations: 10× XP, a combo multiplier, time bonus, boss doubles. */
export function arcade(results: ReviewItem[], times: (number | null)[], total: number) {
  let combo = 0, best = 0, score = 0, lost = 0;
  const lines: ArcadeLine[] = results.map((item, index) => {
    const boss = index === total - 1;
    if (!item.reached) return { base: 0, combo: 0, time: 0, boss, total: 0 };
    if (!item.correct) { combo = 0; lost += 1; return { base: item.points * 10, combo: 0, time: 0, boss, total: 0 }; }
    combo += 1;
    best = Math.max(best, combo);
    const multiplier = Math.min(combo, 3);
    const seconds = times[index];
    const left = seconds === null || seconds === undefined ? 0 : Math.max(0, timeLimit(index, total) - seconds);
    const time = Math.round(left * 6);
    const line = (item.points * 10 * multiplier + time) * (boss ? 2 : 1);
    score += line;
    return { base: item.points * 10, combo: multiplier, time, boss, total: line };
  });
  return { score, combo, best, lives: Math.max(0, LIVES - lost), lines };
}

const SKILL_FIELDS = [
  ["From", "Reply-To", "Sender", "Sender card", "Sender domain"],
  ["Address bar", "Link destination", "Archive destination", "Redeem destination", "Workshop link", "Shared tab"],
  ["Countdown", "Deadline"],
  ["Role", "Organizer", "Approval log", "Voice message"],
  ["Request", "Payment", "Form request", "Permission", "Scope", "Code purpose", "Prompt"],
  ["File name", "File type", "Receipt label"],
];

const skillIndex = (field: string) => {
  const index = SKILL_FIELDS.findIndex(fields => fields.includes(field));
  return index === -1 ? 6 : index;
};

function review(slug: string, state: MissionState, custom?: Scene[]): ReviewItem[] {
  const all = custom ?? scenes[slug];
  return state.choices.map(([choice, checked, tagList], index) => {
    const scene = all[index];
    if (choice === NOT_REACHED) {
      return {
        subject: scene.subject, action: "Not reached", consequence: "You ran out of lives before this situation.",
        lesson: scene.lesson, correct: false, inspected: false, reached: false, points: 0, decisionPoints: 0, evidencePoints: 0,
        clues: scene.clues.map(clue => ({ ...clue, tagged: false })),
      };
    }
    const action = scene.actions[choice];
    const tags = new Set(tagList);
    const indicators = new Set(scene.clues.flatMap((clue, i) => (clue.explanation ? [i] : [])));
    const budget = index === 2 ? 9 : 8;
    const matched = [...tags].filter(tag => indicators.has(tag)).length;
    const falseFlags = [...tags].filter(tag => !indicators.has(tag)).length;
    let evidencePoints = 0;
    if (checked) {
      evidencePoints = indicators.size
        ? Math.round((budget * Math.max(0, matched - falseFlags)) / indicators.size)
        : Math.max(0, budget - 4 * falseFlags);
    }
    const decisionPoints = action.points ?? (action.safe ? 25 : 0);
    return {
      subject: scene.subject,
      action: action.label,
      consequence: action.consequence,
      lesson: scene.lesson,
      correct: action.safe,
      inspected: checked,
      reached: true,
      points: decisionPoints + evidencePoints,
      decisionPoints,
      evidencePoints,
      clues: scene.clues.map((clue, i) => ({ ...clue, tagged: tags.has(i) })),
    };
  });
}

export function scoreMission(slug: string, state: MissionState, custom?: Scene[]) {
  if (state.choices.length < (custom ?? scenes[slug]).length) return null;
  const results = review(slug, state, custom);
  const skills = Array.from({ length: 7 }, () => [0, 0, 0]);
  for (const result of results) {
    // Situations never reached say nothing about the player’s skills.
    if (!result.reached) continue;
    for (const clue of result.clues) {
      const skill = skills[skillIndex(clue.field)];
      if (clue.explanation) {
        skill[0] += Number(clue.tagged);
        skill[1] += 1;
      } else skill[2] += Number(clue.tagged);
    }
  }
  const reached = results.filter(item => item.reached);
  return {
    answer: state.choices.filter(choice => choice[0] !== NOT_REACHED).at(-1)?.[0] ?? 0,
    correct: results.every(item => item.correct),
    xp: results.reduce((sum, item) => sum + item.points, 0),
    scoringVersion,
    arcade: arcade(results, state.times ?? [], results.length).score,
    hooked: results.some(item => !item.reached),
    learning: { skills, right: reached.filter(item => item.correct).length, decisions: reached.length },
  };
}

export function viewMission(slug: string, state: MissionState, custom?: Scene[], customSite?: Site, now = Date.now()): MissionView {
  const all = custom ?? scenes[slug];
  const step = state.choices.length;
  const results = review(slug, state, custom);
  const score = scoreMission(slug, state, custom);
  const site = customSite ?? sites[slug];
  const score_ = arcade(results, state.times ?? [], all.length);
  const playing = state.started && !score;
  const base = {
    kind: "scenes" as const,
    slug,
    step,
    total: all.length,
    started: state.started,
    site: { name: site.name, kind: site.kind, section: site.section, account: site.account, rows: site.rows, task: site.task, intro: site.intro, address: site.address },
    xp: results.reduce((sum, item) => sum + item.points, 0),
    feedback: step ? results[step - 1] : null,
    complete: Boolean(score),
    correct: score?.correct ?? null,
    review: score ? results : null,
    scene: null,
    arcade: {
      score: score_.score,
      combo: score_.combo,
      best: score_.best,
      lives: score_.lives,
      livesMax: LIVES,
      boss: playing && step === all.length - 1,
      limit: playing ? timeLimit(step, all.length) : 0,
      elapsed: playing && state.clockAt ? Math.max(0, Math.round((now - state.clockAt) / 1000)) : null,
      lines: score_.lines,
      hooked: Boolean(score?.hooked),
    },
  };
  if (!state.started || score) return base;
  const scene = all[step];
  const tags = new Set(state.tags);
  return {
    ...base,
    scene: {
      surface: scene.surface,
      address: scene.address,
      sender: scene.sender,
      subject: scene.subject,
      message: scene.message,
      check: scene.check,
      entry: scene.entry ?? null,
      actions: scene.actions.map(action => action.label),
      inspected: state.checked,
      evidence: state.checked ? scene.evidence : null,
      clues: state.checked
        ? scene.clues.map<PublicClue>((clue, i) => ({ field: clue.field, value: clue.value, tagged: tags.has(i) }))
        : null,
    },
  };
}

export type MissionEvent =
  | { kind: "start"; stage: number }
  | { kind: "begin"; stage: number }
  | { kind: "inspect"; stage: number }
  | { kind: "tag"; stage: number; clue: number; tagged: boolean }
  | { kind: "act"; stage: number; action: number };

/** Applies one event. Stale or duplicate events (wrong stage) are ignored. */
export function actMission(slug: string, state: MissionState, event: MissionEvent, custom?: Scene[], now = Date.now()): MissionState {
  const all = custom ?? scenes[slug];
  const step = state.choices.length;
  if (!Number.isInteger(event.stage) || event.stage !== step || step >= all.length) return state;
  const scene = all[step];
  switch (event.kind) {
    case "start":
      return { ...state, started: true, clockAt: now };
    case "begin":
      // The next situation’s clock starts when the player closes the feedback.
      if (!state.started || state.clockAt) return state;
      return { ...state, clockAt: now };
    case "inspect":
      if (!state.started) return state;
      return { ...state, checked: true };
    case "tag": {
      if (!state.started || !state.checked || !Number.isInteger(event.clue) || event.clue < 0 || event.clue >= scene.clues.length) return state;
      const tags = new Set(state.tags);
      if (event.tagged) tags.add(event.clue);
      else tags.delete(event.clue);
      return { ...state, tags: [...tags].sort((a, b) => a - b) };
    }
    case "act":
      if (!state.started || !Number.isInteger(event.action) || event.action < 0 || event.action >= scene.actions.length) return state;
    {
      const seconds = state.clockAt ? Math.round((now - state.clockAt) / 1000) : null;
      const choices: MissionState["choices"] = [...state.choices, [event.action, state.checked, state.tags]];
      const times = [...(state.times ?? []), seconds];
      // Out of lives: the remaining situations are never reached.
      const lost = choices.filter(([choice], i) => choice !== NOT_REACHED && !all[i].actions[choice].safe).length;
      if (lost >= LIVES) {
        while (choices.length < all.length) { choices.push([NOT_REACHED, false, []]); times.push(null); }
      }
      return { started: true, checked: false, tags: [], choices, times };
    }
    default:
      return state;
  }
}

/** Full scene data for server-side helpers (the coach). Never sent to the browser. */
export function sceneDetails(slug: string, step: number, custom?: Scene[]) {
  return (custom ?? scenes[slug])?.[step] ?? null;
}

export function sceneCount(slug: string) {
  return scenes[slug]?.length ?? 0;
}

/** The inbox used as the home page for generated (Endless) missions. */
export const endlessSite: Site = { ...sites["inbox-trap"], intro: "A fresh inbox, written just for this run. Anything could be in it." };

/** A shuffled copy of a mission: situation, choice and clue order all change per run. */
export function dealDeck(slug: string, random = Math.random): Scene[] | undefined {
  const base = scenes[slug];
  if (!base) return undefined;
  const shuffle = <T,>(items: T[]) => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  return shuffle(base).map(scene => ({ ...scene, actions: shuffle(scene.actions), clues: shuffle(scene.clues) }));
}
