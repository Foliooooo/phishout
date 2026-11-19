export function sandboxConfigured() {
  return Boolean(process.env.SANDBOX_URL);
}

export async function sandboxRequest(path: string, owner: string, options: RequestInit = {}) {
  const base = process.env.SANDBOX_URL;
  const secret = process.env.SANDBOX_SECRET;
  if (!base || !secret) return new Response(null, { status: 503 });

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${secret}`);
  headers.set("X-Sandbox-Owner", owner);
  try {
    return await fetch(new URL(path, base), {
      ...options,
      headers,
      cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(35_000),
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export type SandboxStatus = {
  online: boolean;
  max: number;
  active: number;
  idleLimitSeconds: number;
  lifetimeSeconds: number;
  sessions: { slug: string; ageSeconds: number; idleSeconds: number; ready: boolean }[];
};

/** Live VM capacity from the controller’s /status. Offline (not an error) when the VM is off. */
export async function sandboxStatus(): Promise<SandboxStatus> {
  const offline: SandboxStatus = { online: false, max: 6, active: 0, idleLimitSeconds: 90, lifetimeSeconds: 720, sessions: [] };
  if (!sandboxConfigured()) return offline;
  const response = await sandboxRequest("/status", "status", { signal: AbortSignal.timeout(3_000) });
  if (!response.ok) {
    // An older controller without /status still answers /health.
    const health = await sandboxRequest("/health", "status", { signal: AbortSignal.timeout(3_000) });
    return { ...offline, online: health.ok };
  }
  const body = await response.json().catch(() => null);
  if (!body || typeof body.max !== "number" || typeof body.active !== "number") return { ...offline, online: true };
  return {
    online: true,
    max: body.max,
    active: body.active,
    idleLimitSeconds: Number(body.idleLimitSeconds) || 90,
    lifetimeSeconds: Number(body.lifetimeSeconds) || 720,
    sessions: Array.isArray(body.sessions)
      ? body.sessions.filter((item: { slug?: unknown }) => typeof item?.slug === "string").map((item: SandboxStatus["sessions"][number]) => ({
        slug: item.slug, ageSeconds: Number(item.ageSeconds) || 0, idleSeconds: Number(item.idleSeconds) || 0, ready: Boolean(item.ready),
      }))
      : [],
  };
}
