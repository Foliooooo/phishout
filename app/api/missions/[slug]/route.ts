import { auth } from "@/auth";
import { geminiConfigured } from "@/lib/gemini";
import { coachHint, missionReport, rileyReply } from "@/lib/missions/ai";
import { GenerationLimited, applyEvent, directMissions, loadRun, openRun, recordHint, saveReport, view } from "@/lib/missions/runs";
import { predictForPlayer } from "@/lib/prediction";
import { isSuperAdmin } from "@/lib/levels";
import { lockedMessage, missionLocked } from "@/lib/progress";
import type { RunResponse } from "@/lib/missions/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SCENE_EVENTS = new Set(["start", "inspect", "tag", "act"]);
const CHAT_EVENTS = new Set(["message", "notice", "read_mail", "inspect_link", "open_link", "dismiss", "confirm_plan", "report", "submit_demo", "rewind"]);

/**
 * POST { type: "open", fresh?: boolean }      → resume or start a run
 * POST { type: "event", runId, event }        → apply one game event
 * POST { type: "coach", runId, question? }    → Gemini hint for the current situation
 * POST { type: "report", runId }              → Gemini coach report for a finished run
 */
export async function POST(request: Request, { params }: RouteContext<"/api/missions/[slug]">) {
  const { slug } = await params;
  if (!directMissions.has(slug)) return Response.json({ error: "Unknown mission." }, { status: 404 });

  const session = await auth();
  const userId = session?.user.id;
  const sessionId = session?.sessionId;
  if (!userId || !sessionId) return Response.json({ error: "Sign in first." }, { status: 401 });
  const admin = isSuperAdmin(session.user.email);

  const raw = await request.text();
  if (raw.length > 2_000) return new Response(null, { status: 413 });
  let body: { type?: unknown; fresh?: unknown; runId?: unknown; event?: Record<string, unknown>; question?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.type === "open") {
      if (slug === "endless" && !geminiConfigured()) {
        return Response.json({ error: "Endless mode needs Gemini, which isn’t set up on this server." }, { status: 503 });
      }
      if (await missionLocked(userId, session.user.email, slug)) return Response.json({ error: lockedMessage, locked: true }, { status: 403 });
      try {
        const run = await openRun({ userId, sessionId }, slug, body.fresh === true, admin);
        return Response.json({ runId: run._id, view: view(run) } satisfies RunResponse);
      } catch (error) {
        if (error instanceof GenerationLimited) return Response.json({ error: error.message }, { status: 429 });
        if (slug === "endless" && error instanceof Error && /generate/.test(error.message)) {
          return Response.json({ error: "Gemini couldn’t write a valid mission just now. Try again." }, { status: 502 });
        }
        throw error;
      }
    }

    if ((body.type === "coach" || body.type === "report") && typeof body.runId === "string" && uuid.test(body.runId)) {
      const run = await loadRun(userId, body.runId, slug);
      if (!run) return Response.json({ error: "Run not found." }, { status: 404 });
      if (!geminiConfigured()) return Response.json({ error: "The AI coach isn’t set up on this server." }, { status: 503 });
      const current = view(run);

      if (body.type === "coach") {
        if (current.kind !== "scenes" || !current.started || current.complete) return Response.json({ error: "There’s nothing to coach right now." }, { status: 409 });
        const used = run.hints?.[String(current.step)] ?? 0;
        if (used >= 2 && !admin) return Response.json({ error: "You’ve used both hints for this situation." }, { status: 429 });
        const question = typeof body.question === "string" ? body.question.trim().slice(0, 200) || null : null;
        const hint = await coachHint(slug, current.step, Boolean(current.scene?.inspected), question, run.custom).catch(() => null);
        if (!hint) return Response.json({ error: "The coach couldn’t answer that. Try again." }, { status: 502 });
        await recordHint(run._id, current.step);
        return Response.json({ hint, remaining: admin ? 1 : 1 - used }, { headers: { "Cache-Control": "no-store" } });
      }

      if (!current.complete) return Response.json({ error: "Finish the mission first." }, { status: 409 });
      if (run.report) return Response.json({ report: run.report });
      if (current.kind !== "scenes" || !current.review) return Response.json({ error: "No report for this mission." }, { status: 404 });
      const { prediction } = await predictForPlayer(userId);
      const report = await missionReport(slug, current.review, current.xp, prediction).catch(() => null);
      if (!report) return Response.json({ error: "The coach couldn’t write a report. Try again." }, { status: 502 });
      await saveReport(run._id, report);
      return Response.json({ report });
    }

    if (body.type !== "event" || typeof body.runId !== "string" || !uuid.test(body.runId) || !body.event || typeof body.event !== "object") {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    const allowed = slug === "crush-switch" ? CHAT_EVENTS : SCENE_EVENTS;
    if (typeof body.event.kind !== "string" || !allowed.has(body.event.kind)) {
      return Response.json({ error: "Invalid event." }, { status: 400 });
    }
    const run = await loadRun(userId, body.runId, slug);
    if (!run) return Response.json({ error: "Run not found." }, { status: 404 });

    // The engines validate every field; this keeps only plain values. A reply
    // is never accepted from the browser: the server writes Riley's lines.
    const { text, reply: _ignored, ...rest } = body.event;
    void _ignored;
    const event: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)),
    );
    if (slug === "crush-switch" && event.kind === "message" && typeof text === "string" && text.trim() && geminiConfigured()) {
      // The player's text is only used to write this reply. It is not stored.
      const generated = await rileyReply(Number(event.turn), text.trim()).catch(() => null);
      if (generated) event.reply = generated;
    }
    const result = await applyEvent(run, event as never);
    return Response.json({ runId: result.run._id, view: view(result.run), saved: result.saved } satisfies RunResponse);
  } catch (error) {
    console.error("Mission request failed", error);
    return Response.json({ error: "The mission server is unavailable. Is MongoDB running?" }, { status: 503 });
  }
}
