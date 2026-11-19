import { auth } from "@/auth";
import { saveSandboxScore } from "@/lib/sandbox-attempts";
import { sandboxRequest } from "@/lib/sandbox-service";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorize({ params }: RouteContext<"/api/sandbox/[id]">) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id || !session.sessionId) {
    return { error: new Response(null, { status: 401 }) };
  }
  if (!uuid.test(id)) return { error: new Response(null, { status: 404 }) };

  return { id, userId: session.user.id, sessionId: session.sessionId };
}

export async function GET(request: Request, context: RouteContext<"/api/sandbox/[id]">) {
  const access = await authorize(context);
  if (access.error) return access.error;
  const frame = await sandboxRequest(`/sessions/${access.id}`, access.sessionId, { signal: request.signal });
  if (!frame.ok) return new Response(null, { status: frame.status });

  return new Response(frame.body, {
    headers: { "Content-Type": "video/mp4", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

export async function POST(request: Request, context: RouteContext<"/api/sandbox/[id]">) {
  const access = await authorize(context);
  if (access.error) return access.error;
  const input = await request.text();
  if (input.length > 256) return new Response(null, { status: 413 });

  const reply = await sandboxRequest(`/sessions/${access.id}`, access.sessionId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: input,
  });
  if (!reply.ok) return new Response(null, { status: reply.status });
  const activity = await reply.json();

  try {
    const score = await saveSandboxScore(
      { _id: access.id, userId: access.userId, sessionId: access.sessionId },
      activity,
    );
    return score ? Response.json(score) : new Response(null, { status: 204 });
  } catch (error) {
    console.error("Could not save mission outcome", error);
    return new Response(null, { status: 503 });
  }
}
