import { auth } from "@/auth";
import { getGame } from "@/lib/games";
import { getDatabase } from "@/lib/mongodb";
import { saveSandboxScore } from "@/lib/sandbox-attempts";
import { sandboxRequest } from "@/lib/sandbox-service";
import { lockedMessage, missionLocked } from "@/lib/progress";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user.id;
  const sessionId = session?.sessionId;
  if (!userId || !sessionId) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const event = await request.json().catch(() => null);
  if (!event || !["open", "close"].includes(event.type)) {
    return Response.json({ error: "Invalid activity." }, { status: 400 });
  }

  const { type, slug, attemptId, display } = event;
  if (
    typeof slug !== "string" ||
    !getGame(slug) ||
    typeof attemptId !== "string" ||
    !uuid.test(attemptId) ||
    (type === "open" && display !== "native" && display !== "viewport")
  ) {
    return Response.json({ error: "Invalid browser attempt." }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const now = new Date();

    if (type !== "close") {
      await Promise.all([
        db.collection<{ _id: string }>("accounts").updateOne(
          { _id: userId },
          { $max: { lastSeenAt: now } },
        ),
        db.collection<{ _id: string }>("account_sessions").updateOne(
          { _id: sessionId },
          { $max: { lastSeenAt: now } },
        ),
      ]);
    }

    const attempts = db.collection<{ _id: string; closedAt?: Date }>("browser_attempts");
    const attempt = { _id: attemptId, userId, sessionId, slug };
    if (type === "open") {
      if (await missionLocked(userId, session.user.email, slug)) {
        return Response.json({ status: "locked", error: lockedMessage }, { status: 403 });
      }
      await attempts.updateOne(
        attempt,
        { $setOnInsert: { openedAt: now, display, outcome: "assigning" } },
        { upsert: true },
      );
      if ((await attempts.findOne(attempt))?.closedAt) {
        return Response.json({ status: "unavailable" }, { status: 409 });
      }
      const allocation = await sandboxRequest("/sessions", sessionId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attemptId, slug }),
      });
      const status = allocation.ok ? "live" : allocation.status === 429 ? "busy" : "unavailable";
      await attempts.updateOne(attempt, {
        $set: { outcome: status === "live" ? "sandbox_live" : `sandbox_${status}` },
      });
      return Response.json({ status });
    }

    if (!(await attempts.findOne(attempt))) {
      return Response.json({ error: "Attempt not found." }, { status: 404 });
    }

    const closed = await sandboxRequest(`/sessions/${attemptId}`, sessionId, { method: "DELETE" });
    const activity = closed.ok ? await closed.json() : null;
    await attempts.updateOne(attempt, {
      $min: { closedAt: now },
      ...(activity ? { $set: { missionActivity: activity } } : {}),
    });

    await saveSandboxScore(attempt, activity);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Could not persist PHISH OUT activity", error);
    return Response.json({ error: "Activity could not be saved." }, { status: 503 });
  }
}
