/**
 * Client for the terminal sandbox service (sandbox/terminal/service.py).
 * Uses the same secret as the browser sandbox; the owner is the app session.
 */
export function terminalConfigured() {
  return Boolean(process.env.TERMINAL_URL && process.env.SANDBOX_SECRET);
}

export async function terminalRequest(path: string, owner: string, options: RequestInit = {}) {
  const base = process.env.TERMINAL_URL;
  const secret = process.env.SANDBOX_SECRET;
  if (!base || !secret) return new Response(null, { status: 503 });
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${secret}`);
  headers.set("X-Sandbox-Owner", owner);
  if (options.body) headers.set("Content-Type", "application/json");
  try {
    return await fetch(new URL(path, base), { ...options, headers, cache: "no-store", signal: options.signal ?? AbortSignal.timeout(10_000) });
  } catch {
    return new Response(null, { status: 503 });
  }
}
