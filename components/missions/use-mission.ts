"use client";

import type { MissionReport, MissionView, RunResponse } from "@/lib/missions/types";
import { useCallback, useEffect, useRef, useState } from "react";

const resuming = new Map<string, Promise<RunResponse | null>>();

export type MissionStatus = "loading" | "ready" | "error" | "signed-out";

/** Talks to /api/missions/[slug]. One request in flight at a time. */
export function useMission<V extends MissionView>(slug: string) {
  const [runId, setRunId] = useState<string | null>(null);
  const [view, setView] = useState<V | null>(null);
  const [status, setStatus] = useState<MissionStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<RunResponse["saved"]>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const runRef = useRef<string | null>(null);

  const request = useCallback(async (body: object) => {
    const response = await fetch(`/api/missions/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      setStatus("signed-out");
      return null;
    }
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Request failed");
    return (await response.json()) as RunResponse;
  }, [slug]);

  const open = useCallback(async (fresh = false) => {
    setStatus("loading");
    setSaved(null);
    try {
      // Strict Mode mounts twice; share one resume request so only one run opens.
      let pending = fresh ? undefined : resuming.get(slug);
      if (!pending) {
        pending = request({ type: "open", fresh });
        if (!fresh) {
          resuming.set(slug, pending);
          void pending.finally(() => setTimeout(() => resuming.delete(slug), 1_000)).catch(() => {});
        }
      }
      const result = await pending;
      if (!result) return;
      runRef.current = result.runId;
      setRunId(result.runId);
      setView(result.view as V);
      setStatus("ready");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : null);
      setStatus("error");
    }
  }, [request, slug]);

  /** Sends one event. Returns the new view, or null if another is pending. */
  const send = useCallback(async (event: Record<string, unknown>) => {
    if (inFlight.current || !runRef.current) return null;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await request({ type: "event", runId: runRef.current, event });
      if (!result) return null;
      setView(result.view as V);
      if (result.saved) setSaved(result.saved);
      return result.view as V;
    } catch {
      setStatus("error");
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    // Loading the run is the effect's whole job: it syncs with the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void open();
  }, [open]);

  /** Asks the AI coach for a hint. Resolves to the hint or a readable error. */
  const coach = useCallback(async (question?: string) => {
    if (!runRef.current) return { error: "The mission isn’t ready yet." };
    const response = await fetch(`/api/missions/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "coach", runId: runRef.current, question }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (!response?.ok) return { error: (body?.error as string) ?? "The coach is unavailable." };
    return { hint: body.hint as string, remaining: body.remaining as number };
  }, [slug]);

  /** Fetches (or generates once) the AI coach report for a finished run. */
  const report = useCallback(async () => {
    if (!runRef.current) return null;
    const response = await fetch(`/api/missions/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "report", runId: runRef.current }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    return response?.ok ? (body.report as MissionReport) : { error: (body?.error as string) ?? "The coach is unavailable." };
  }, [slug]);

  return { runId, view, status, busy, saved, error, open, send, coach, report };
}
