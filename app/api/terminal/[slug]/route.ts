import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { parseLearning } from "@/lib/learning";
import { getDatabase } from "@/lib/mongodb";
import { TERMINAL_CASES, newTerminalState, publicCase, scoreTerminal, type TerminalCase, type TerminalState } from "@/lib/missions/terminal-cases";
import { scoringVersion } from "@/lib/game-scoring";
import { terminalConfigured, terminalRequest } from "@/lib/terminal-service";
import { lockedMessage, missionLocked } from "@/lib/progress";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Run = {
  _id: string; userId: string; sessionId: string; slug: string; kind: "terminal";
  state: TerminalState; rev: number; createdAt: Date; updatedAt: Date; completedAt?: Date;
};

const runs = () => getDatabase().collection<Run>("mission_runs");
const attempts = () => getDatabase().collection<{ _id: string }>("browser_attempts");

async function access(context: RouteContext<"/api/terminal/[slug]">) {
  const { slug } = await context.params;
  if (!(slug in TERMINAL_CASES)) return { error: Response.json({ error: "Unknown case." }, { status: 404 }) };
  const session = await auth();
  if (!session?.user.id || !session.sessionId) return { error: Response.json({ error: "Sign in first." }, { status: 401 }) };
  return { slug: slug as TerminalCase["slug"], userId: session.user.id, sessionId: session.sessionId, email: session.user.email };
}

function payload(run: Run, extra: Record<string, unknown> = {}) {
  const score = scoreTerminal(run.slug as TerminalCase["slug"], run.state);
  return { runId: run._id, questions: publicCase(run.slug as TerminalCase["slug"], run.state), xp: score.xp, complete: score.complete, ...extra };
}

/** Long-polls terminal output for the player's own run. */
export async function GET(request: Request, context: RouteContext<"/api/terminal/[slug]">) {
  const who = await access(context);
  if (who.error) return who.error;
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId") ?? "";
  const since = Math.max(0, Number(url.searchParams.get("since")) || 0);
  if (!uuid.test(runId) || !await runs().findOne({ _id: runId, userId: who.userId, slug: who.slug })) return new Response(null, { status: 404 });
  const reply = await terminalRequest(`/sessions/${runId}?since=${since}`, who.sessionId, { signal: AbortSignal.timeout(25_000) });
  if (!reply.ok) return new Response(null, { status: reply.status === 404 ? 410 : reply.status });
  return new Response(reply.body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

/**
 * POST { type: "open" }                       → start (or resume) a run and its shell
 * POST { type: "input", runId, data }         → keystrokes
 * POST { type: "resize", runId, cols, rows }  → terminal size
 * POST { type: "answer", runId, question, value }
 * POST { type: "close", runId }
 */
export async function POST(request: Request, context: RouteContext<"/api/terminal/[slug]">) {
  const who = await access(context);
  if (who.error) return who.error;
  const raw = await request.text();
  if (raw.length > 8_000) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.type === "open") {
      if (await missionLocked(who.userId, who.email, who.slug)) return Response.json({ error: lockedMessage, locked: true }, { status: 403 });
      if (!terminalConfigured()) return Response.json({ error: "The terminal VM isn’t connected.", vm: false }, { status: 503 });
      const now = new Date();
      let run = await runs().findOne({ userId: who.userId, slug: who.slug, kind: "terminal", completedAt: { $exists: false }, updatedAt: { $gt: new Date(now.getTime() - 3600_000) } }, { sort: { updatedAt: -1 } });
      if (!run) {
        run = { _id: randomUUID(), userId: who.userId, sessionId: who.sessionId, slug: who.slug, kind: "terminal", state: newTerminalState(), rev: 0, createdAt: now, updatedAt: now };
        await runs().insertOne(run);
        await attempts().insertOne({ _id: run._id, userId: who.userId, sessionId: who.sessionId, slug: who.slug, openedAt: now, display: "terminal", outcome: "terminal_live" } as { _id: string });
      }
      // One shell per player: close any other open terminal runs first.
      const others = await runs().find({ userId: who.userId, kind: "terminal", completedAt: { $exists: false }, _id: { $ne: run._id }, updatedAt: { $gt: new Date(now.getTime() - 3600_000) } }, { projection: { _id: 1 } }).toArray();
      await Promise.all(others.map(other => terminalRequest(`/sessions/${other._id}`, who.sessionId, { method: "DELETE" })));
      const started = await terminalRequest("/sessions", who.sessionId, { method: "POST", body: JSON.stringify({ id: run._id, case: who.slug }) });
      if (started.status === 429) return Response.json({ error: "All four terminals are busy. Try again in a minute.", vm: true }, { status: 429 });
      if (started.status === 409) return Response.json({ error: "You already have a terminal open in another tab. Close it first.", vm: true }, { status: 409 });
      if (!started.ok) return Response.json({ error: "The terminal VM isn’t reachable right now.", vm: false }, { status: 503 });
      return Response.json(payload(run));
    }

    const runId = typeof body.runId === "string" && uuid.test(body.runId) ? body.runId : null;
    const run = runId ? await runs().findOne({ _id: runId, userId: who.userId, slug: who.slug, kind: "terminal" }) : null;
    if (!run) return Response.json({ error: "Run not found." }, { status: 404 });

    if (body.type === "input" && typeof body.data === "string") {
      const reply = await terminalRequest(`/sessions/${run._id}`, who.sessionId, { method: "POST", body: JSON.stringify({ data: body.data.slice(0, 4096) }) });
      return new Response(null, { status: reply.ok ? 204 : 410 });
    }
    if (body.type === "resize" && Number.isInteger(body.cols) && Number.isInteger(body.rows)) {
      const reply = await terminalRequest(`/sessions/${run._id}`, who.sessionId, { method: "POST", body: JSON.stringify({ cols: body.cols, rows: body.rows }) });
      return new Response(null, { status: reply.ok ? 204 : 410 });
    }
    if (body.type === "close") {
      await terminalRequest(`/sessions/${run._id}`, who.sessionId, { method: "DELETE" });
      return new Response(null, { status: 204 });
    }

    if (body.type === "answer" && typeof body.question === "string" && typeof body.value === "string") {
      const question = TERMINAL_CASES[who.slug].questions.find(item => item.id === body.question);
      if (!question) return Response.json({ error: "Unknown question." }, { status: 400 });
      const value = body.value.trim().slice(0, 200);
      if (!value) return Response.json({ error: "Type an answer first." }, { status: 400 });
      if (run.completedAt || run.state.answers[question.id]?.correct) return Response.json(payload(run, { correct: true }));
      const correct = question.accept(value);
      const previous = run.state.answers[question.id] ?? { tries: 0, correct: false };
      const state: TerminalState = { answers: { ...run.state.answers, [question.id]: { tries: previous.tries + 1, correct } } };
      const score = scoreTerminal(who.slug, state);
      const now = new Date();
      const updated = await runs().findOneAndUpdate(
        { _id: run._id, rev: run.rev },
        { $set: { state, updatedAt: now, ...(score.complete ? { completedAt: now } : {}) }, $inc: { rev: 1 } },
        { returnDocument: "after" },
      );
      if (!updated) return Response.json({ error: "Please try again." }, { status: 409 });
      if (score.complete) {
        const learning = parseLearning(score.learning);
        await attempts().updateOne(
          { _id: run._id, userId: who.userId, completedAt: { $exists: false } },
          { $set: { completedAt: now, closedAt: now, outcome: "terminal_complete", answer: 0, correct: score.xp === 100, xp: score.xp, scoringVersion, ...(learning ? { learning } : {}) } },
        );
        await terminalRequest(`/sessions/${run._id}`, who.sessionId, { method: "DELETE" });
      }
      return Response.json(payload(updated, { correct }));
    }

    return Response.json({ error: "Invalid request." }, { status: 400 });
  } catch (error) {
    console.error("Terminal request failed", error);
    return Response.json({ error: "The mission server is unavailable." }, { status: 503 });
  }
}
