/**
 * Minimal server-side Gemini client. Every call asks for JSON that matches a
 * schema, and every caller validates the result before using it. Nothing here
 * runs in the browser: the API key stays on the server.
 */

type Schema = Record<string, unknown>;

export class GeminiUnavailable extends Error {}

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateJson<T>({
  system, prompt, schema, timeoutMs = 20_000, temperature, fast = false,
}: {
  system: string; prompt: string; schema: Schema; timeoutMs?: number; temperature?: number;
  /** Ask for minimal thinking, for latency-sensitive replies. Retried without it if the model refuses. */
  fast?: boolean;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  if (!key) throw new GeminiUnavailable("GEMINI_API_KEY is not set.");
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(model)) throw new GeminiUnavailable("GEMINI_MODEL must be a model ID.");

  const deadline = AbortSignal.timeout(timeoutMs);
  const call = (minimalThinking: boolean) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: deadline,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        ...(temperature === undefined ? {} : { temperature }),
        ...(minimalThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  let response = await call(fast);
  if (fast && response.status === 400) response = await call(false);
  if (!response.ok) throw new GeminiUnavailable(`Gemini returned HTTP ${response.status}.`);
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.find((part: { text?: string; thought?: boolean }) => part.text && !part.thought)?.text;
  if (!text) throw new GeminiUnavailable("Gemini returned no content.");
  return JSON.parse(text) as T;
}

/** Plain, short, link-free text: safe to show in the game. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > max) return null;
  if (/https?:|www\.|<[a-z/]|[\w-]+\.(com|net|org|io|in)\b/i.test(text)) return null;
  return text;
}
