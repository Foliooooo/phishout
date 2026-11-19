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
  /** [action index, inspected, tagged clue indexes] per finished scene. */
  choices: [number, boolean, number[]][];
};

export const newMissionState = (): MissionState => ({ started: false, checked: false, tags: [], choices: [] });

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
    for (const clue of result.clues) {
      const skill = skills[skillIndex(clue.field)];
      if (clue.explanation) {
        skill[0] += Number(clue.tagged);
        skill[1] += 1;
      } else skill[2] += Number(clue.tagged);
    }
  }
  return {
    answer: state.choices.at(-1)![0],
    correct: results.every(item => item.correct),
    xp: results.reduce((sum, item) => sum + item.points, 0),
    scoringVersion,
    learning: { skills, right: results.filter(item => item.correct).length, decisions: results.length },
  };
}

export function viewMission(slug: string, state: MissionState, custom?: Scene[], customSite?: Site): MissionView {
  const all = custom ?? scenes[slug];
  const step = state.choices.length;
  const results = review(slug, state, custom);
  const score = scoreMission(slug, state, custom);
  const site = customSite ?? sites[slug];
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
  | { kind: "inspect"; stage: number }
  | { kind: "tag"; stage: number; clue: number; tagged: boolean }
  | { kind: "act"; stage: number; action: number };

/** Applies one event. Stale or duplicate events (wrong stage) are ignored. */
export function actMission(slug: string, state: MissionState, event: MissionEvent, custom?: Scene[]): MissionState {
  const all = custom ?? scenes[slug];
  const step = state.choices.length;
  if (!Number.isInteger(event.stage) || event.stage !== step || step >= all.length) return state;
  const scene = all[step];
  switch (event.kind) {
    case "start":
      return { ...state, started: true };
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
      return { started: true, checked: false, tags: [], choices: [...state.choices, [event.action, state.checked, state.tags]] };
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
