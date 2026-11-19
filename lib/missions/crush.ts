import { scoringVersion } from "@/lib/game-scoring";
import type { ChatView } from "./types";

/** Crush Switch rules, ported from the VM fixture (sandbox/browser/fakestagram.py). */

export const REACTIONS = [
  "wait really? okay that’s actually cute. I was hoping you’d say something first",
  "Cedar Roof, Saturday at seven? send me a confirmation so I can book",
  "one sec, sending you the invite now!",
];

export type CrushState = {
  messages: number;
  notice: boolean;
  mailOpened: boolean;
  linkOpened: boolean;
  dismissed: boolean;
  inspected: boolean;
  confirmed: boolean;
  ending: 0 | 1 | null;
  timeline: string[];
  /** Riley’s replies written live by Gemini; fixed REACTIONS fill any gaps. */
  replies?: string[];
  /** Score of the first finish. A rewind keeps it so the replay is unranked. */
  original: ReturnType<typeof scoreCrush> | null;
};

export const newCrushState = (): CrushState => ({
  messages: 0, notice: false, mailOpened: false, linkOpened: false, dismissed: false,
  inspected: false, confirmed: false, ending: null, timeline: [], original: null,
});

function breakdown(state: CrushState) {
  return [
    { label: "Confirmed the plan in the original session", points: state.confirmed ? 25 : 0 },
    { label: "Inspected the email link", points: state.inspected ? 25 : 0 },
    { label: "Reported through the original session", points: state.ending === 1 ? 50 : 0 },
  ];
}

export function scoreCrush(state: CrushState) {
  if (state.ending === null) return null;
  return {
    answer: state.ending,
    correct: state.ending === 1,
    xp: breakdown(state).reduce((sum, item) => sum + item.points, 0),
    scoringVersion,
    learning: {
      skills: [[0, 0, 0], [Number(state.inspected), 1, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [Number(state.confirmed), 1, 0]],
      right: Number(state.ending === 1),
      decisions: 1,
    },
  };
}

export function viewCrush(state: CrushState): ChatView {
  const items = breakdown(state);
  return {
    kind: "chat",
    slug: "crush-switch",
    messages: state.messages,
    replies: REACTIONS.slice(0, state.messages).map((fixed, index) => state.replies?.[index] ?? fixed),
    notice: state.notice,
    mailOpened: state.mailOpened,
    inspected: state.inspected,
    linkOpened: state.linkOpened,
    dismissed: state.dismissed,
    confirmed: state.confirmed,
    timeline: state.timeline,
    complete: state.ending !== null,
    correct: state.ending === null ? null : state.ending === 1,
    xp: items.reduce((sum, item) => sum + item.points, 0),
    breakdown: items,
    ranked: state.original === null,
  };
}

export type CrushEvent =
  | { kind: "message"; turn: number; reply?: string }
  | { kind: "notice" | "read_mail" | "inspect_link" | "open_link" | "dismiss" | "confirm_plan" | "report" | "submit_demo" | "rewind" };

const record = (state: CrushState, label: string) =>
  state.timeline.includes(label) ? state.timeline : [...state.timeline, label];

export function actCrush(state: CrushState, event: CrushEvent): CrushState {
  if (event.kind === "rewind") {
    if (state.ending !== 0) return state;
    return {
      ...state, ending: null, dismissed: false, confirmed: false, inspected: false, mailOpened: false, linkOpened: false,
      original: state.original ?? scoreCrush(state), timeline: ["Rewound to the session notice"],
    };
  }
  if (state.ending !== null) return state;
  switch (event.kind) {
    case "message":
      if (state.messages >= REACTIONS.length || event.turn !== state.messages) return state;
      return {
        ...state,
        messages: state.messages + 1,
        replies: [...(state.replies ?? REACTIONS.slice(0, state.messages)), event.reply ?? REACTIONS[state.messages]],
      };
    case "notice":
      return state.messages === REACTIONS.length && !state.notice
        ? { ...state, notice: true, timeline: record(state, "Session notice appeared over Direct") } : state;
    case "read_mail":
      return state.notice ? { ...state, mailOpened: true, timeline: record(state, "Read the recovery message") } : state;
    case "inspect_link":
      return state.mailOpened ? { ...state, inspected: true, timeline: record(state, "Inspected the destination domain") } : state;
    case "open_link":
      return state.mailOpened ? { ...state, linkOpened: true, timeline: record(state, "Opened the signup link on fakestagram-session.example") } : state;
    case "dismiss":
      return state.notice ? { ...state, dismissed: true, timeline: record(state, "Dismissed the notice") } : state;
    case "confirm_plan":
      return state.dismissed ? { ...state, confirmed: true, timeline: record(state, "Sent a confirmation from the original account") } : state;
    case "report":
      return state.dismissed && state.mailOpened
        ? { ...state, ending: 1, timeline: record(state, "Reported the email through the original account") } : state;
    case "submit_demo":
      return state.linkOpened
        ? { ...state, ending: 0, timeline: record(state, "Submitted the fixed training details") } : state;
    default:
      return state;
  }
}
