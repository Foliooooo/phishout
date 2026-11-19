import { generateJson } from "@/lib/gemini";
import type { Scene } from "./engine";

/**
 * Endless mode: Gemini writes a fresh three-situation inbox mission in the
 * exact shape of the hand-built ones. Everything is validated before it can be
 * played; anything that fails is rejected and generated again.
 */

const FIELD_HINT = "From, Reply-To, Sender domain, Link destination, Deadline, Payment, Request, Role, Attachment, Ticket record, Message";

const SYSTEM = `You write training content for PHISH//OUT, a defensive phishing-awareness game for students and new employees.
Everything is fictional. Use ONLY made-up organisations and people, and ONLY domains that end in ".example" (for example northwind.example, mail.northwind.example, northwind-help.example). Never use a real company, brand, product, person or real domain. Never include real phone numbers, real URLs, or anything that asks for real credentials. Never write instructions for attacking anyone.

Write exactly 3 email situations for the player's inbox, in this order of difficulty: easy, medium, hard.
- Exactly one of the three must be a GENUINE, legitimate email (the safe action is to act on it normally, e.g. archive or follow the known process), so players learn not to fear every email.
- The other two are phishing, each using a different tactic (e.g. lookalike sender domain, urgent deadline, payment or gift-card request, credential or code request, fake invoice attachment, reply-to mismatch, authority impersonation).
- "sender" is "Name · HH:MM". "subject" ≤ 80 chars. "message" 1–3 sentences, ≤ 320 chars, written as the email body.
- "check" is the inspect action label, e.g. "Show message headers and link destination". "evidence" (≤ 260 chars) is what that check reveals.
- "actions": 2–4 short labels (≤ 40 chars). At least one must be safe. Use "points" only for partially safe actions (10 or 20); omit it otherwise. "consequence" ≤ 200 chars says what happened.
- "clues": 3–6 details the player can flag, each with a "field" (like ${FIELD_HINT}) and the exact "value". Suspicious clues have an "explanation" (≤ 160 chars); ordinary details have explanation null. Include at least one ordinary detail in every situation. The genuine email's clues are all ordinary.
- "lesson" ≤ 220 chars: the habit to take away.`;

const schema = {
  type: "OBJECT", required: ["scenes"],
  properties: {
    scenes: {
      type: "ARRAY", minItems: 3, maxItems: 3,
      items: {
        type: "OBJECT",
        required: ["sender", "subject", "message", "check", "evidence", "actions", "lesson", "clues"],
        properties: {
          sender: { type: "STRING" }, subject: { type: "STRING" }, message: { type: "STRING" },
          check: { type: "STRING" }, evidence: { type: "STRING" }, lesson: { type: "STRING" },
          actions: { type: "ARRAY", items: { type: "OBJECT", required: ["label", "safe", "consequence"], properties: {
            label: { type: "STRING" }, safe: { type: "BOOLEAN" }, points: { type: "INTEGER" }, consequence: { type: "STRING" },
          } } },
          clues: { type: "ARRAY", items: { type: "OBJECT", required: ["field", "value"], properties: {
            field: { type: "STRING" }, value: { type: "STRING" }, explanation: { type: "STRING", nullable: true },
          } } },
        },
      },
    },
  },
};

type Raw = {
  sender?: unknown; subject?: unknown; message?: unknown; check?: unknown; evidence?: unknown; lesson?: unknown;
  actions?: { label?: unknown; safe?: unknown; points?: unknown; consequence?: unknown }[];
  clues?: { field?: unknown; value?: unknown; explanation?: unknown }[];
};

const REAL_TLDS = /\.(com|net|org|io|co|in|uk|us|gov|edu|app|dev|ai|me|info|biz|xyz|ly|gg|tv|ru|cn|de|fr|au|ca|jp|ch|nl|eu|online|site|store|shop|link|click|top)\b/i;

/**
 * Every host in a URL or email address must be a reserved .example domain, and
 * no bare token may sit on a real top-level domain. Text is only ever shown,
 * never turned into a clickable link.
 */
export function fictional(text: string) {
  const urls = [...text.matchAll(/https?:\/\/([^\s/'"<>),]+)/gi)].map(match => match[1].toLowerCase());
  const emails = [...text.matchAll(/[\w.+-]+@([\w.-]+\.[a-z]+)/gi)].map(match => match[1].toLowerCase());
  if ([...urls, ...emails].some(host => !host.replace(/:\d+$/, "").endsWith(".example"))) return false;
  const withoutKnown = text.replace(/https?:\/\/\S+/gi, "").replace(/[\w.+-]+@[\w.-]+/g, "");
  return !REAL_TLDS.test(withoutKnown) && !/www\./i.test(withoutKnown);
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean && clean.length <= max && fictional(clean) ? clean : null;
}

function validScene(raw: Raw): Scene | null {
  const sender = text(raw.sender, 80), subject = text(raw.subject, 90), message = text(raw.message, 360);
  const check = text(raw.check, 80), evidence = text(raw.evidence, 300), lesson = text(raw.lesson, 260);
  if (!sender || !subject || !message || !check || !evidence || !lesson) return null;
  if (!Array.isArray(raw.actions) || raw.actions.length < 2 || raw.actions.length > 4) return null;
  if (!Array.isArray(raw.clues) || raw.clues.length < 3 || raw.clues.length > 6) return null;
  const actions = raw.actions.map(action => {
    const label = text(action.label, 44), consequence = text(action.consequence, 220);
    if (!label || !consequence || typeof action.safe !== "boolean") return null;
    const points = action.points === 10 || action.points === 20 ? action.points : undefined;
    return { label, safe: action.safe, consequence, ...(points && action.safe ? { points } : {}) };
  });
  const clues = raw.clues.map(clue => {
    const field = text(clue.field, 40), value = text(clue.value, 140);
    if (!field || !value) return null;
    const explanation = clue.explanation === null || clue.explanation === undefined || clue.explanation === "" ? null : text(clue.explanation, 180);
    if (clue.explanation && !explanation) return null;
    return { field, value, explanation };
  });
  if (actions.some(action => !action) || clues.some(clue => !clue)) return null;
  const okActions = actions as NonNullable<(typeof actions)[number]>[];
  const okClues = clues as NonNullable<(typeof clues)[number]>[];
  if (!okActions.some(action => action.safe && !action.points)) return null;
  if (!okClues.some(clue => clue.explanation === null)) return null;
  if (new Set(okActions.map(action => action.label.toLowerCase())).size !== okActions.length) return null;
  return {
    surface: "Novabyte Mail", address: "mail.novabyte.example/inbox", entry: "Open message",
    sender, subject, message, check, evidence, actions: okActions, lesson, clues: okClues,
  };
}

export async function generateEndlessMission(): Promise<Scene[]> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await generateJson<{ scenes?: Raw[] }>({
      system: SYSTEM,
      prompt: `Write a new mission. Theme seed: ${Math.random().toString(36).slice(2, 8)} (use it only to vary the organisation and story).`,
      schema,
      temperature: 1,
      timeoutMs: 40_000,
      fast: true,
    }).catch(() => null);
    const scenes = result?.scenes?.map(validScene);
    if (scenes?.length === 3 && scenes.every(Boolean)) {
      const valid = scenes as Scene[];
      const genuine = valid.filter(scene => scene.clues.every(clue => clue.explanation === null)).length;
      const phishing = valid.filter(scene => scene.clues.some(clue => clue.explanation)).length;
      if (genuine >= 1 && phishing >= 1) return valid;
    }
  }
  throw new Error("Couldn’t generate a valid mission.");
}
