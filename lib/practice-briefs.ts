import { getGame, games } from "@/lib/games";
import { getDatabase } from "@/lib/mongodb";
import { skillNames } from "@/lib/learning";

type Brief = { slug: string; title: string; objective: string };
type Draft = Brief & { revision: string };

export function practiceBriefs() {
  return getDatabase().collection<{ _id: string; draft?: Draft; published?: Draft }>("practice_briefs");
}

export async function draftPracticeBrief(skill: string): Promise<Brief> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Set GEMINI_API_KEY on the frontend server first.");
  if (!skillNames.some(name => name === skill)) throw new Error("Choose a skill to practise.");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(model)) throw new Error("GEMINI_MODEL must be a model ID.");
  const prompt = `Write a short player-facing practice brief for ${skill} in a defensive security arcade. Choose one existing fictional sandbox mission from this catalog: ${JSON.stringify(games.map(({ slug, objective }) => ({ slug, objective })))}. Title up to 60 characters and one coaching sentence up to 200 characters. Use plain text and general defensive advice. Do not reveal the answer or write an example lure, URL, email address, password prompt, HTML, or instructions to interact with an outside service.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: {
        type: "OBJECT", required: ["slug", "title", "objective"],
        properties: { slug: { type: "STRING", enum: games.map(game => game.slug) }, title: { type: "STRING" }, objective: { type: "STRING" } },
      } },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}. Check the key, model, and quota.`);
  const result = await response.json();
  const draft = JSON.parse(result.candidates?.[0]?.content?.parts?.find((part: { text?: string; thought?: boolean }) => part.text && !part.thought)?.text ?? "null");
  if (!draft || typeof draft.slug !== "string" || !getGame(draft.slug) ||
    !validText(draft.title, 60) || !validText(draft.objective, 200)) {
    throw new Error("Gemini returned a brief that failed validation. Try again.");
  }
  return { slug: draft.slug, title: draft.title.trim(), objective: draft.objective.trim() };
}

function validText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum &&
    !/[<>@/\r\n]|\bwww\b|\w\.\w/i.test(value);
}
