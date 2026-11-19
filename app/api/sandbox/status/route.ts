import { connection } from "next/server";
import { sandboxStatus } from "@/lib/sandbox-service";

/** Public VM capacity: slots in use and which missions are running. No player data. */
export async function GET() {
  // Live data: never prerender this at build time.
  await connection();
  const status = await sandboxStatus();
  return Response.json(status, { headers: { "Cache-Control": "public, max-age=3" } });
}
