import { auth } from "@/auth";
import { getParty, isOpen, normalizeCode, partyLeaderboard } from "@/lib/party";

/** Live party leaderboard. Public by code, so a projector can show it without signing in. */
export async function GET(_request: Request, context: RouteContext<"/api/party/[code]">) {
  const code = normalizeCode((await context.params).code);
  const party = code ? await getParty(code) : null;
  if (!party) return Response.json({ error: "No party with that code." }, { status: 404 });
  const session = await auth().catch(() => null);
  const rows = await partyLeaderboard(party, session?.user.id);
  return Response.json(
    { name: party.name, open: isOpen(party), endsAt: party.endsAt.toISOString(), members: party.members.length, rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
