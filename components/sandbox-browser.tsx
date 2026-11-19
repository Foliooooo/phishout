"use client";

import { Button, buttonStyles } from "@/components/ui/button";
import { SandboxViewport } from "@/components/sandbox-viewport";
import { SandboxBoot } from "@/components/sandbox-boot";
import { Scales } from "@/components/ui/scales";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type BrowserStatus = "assigning" | "live" | "busy" | "unavailable" | "error" | "ended";

type Attempt = {
  id: string;
  display: Promise<"native" | "viewport">;
  saved?: Promise<BrowserStatus>;
  closing?: boolean;
};

function record(slug: string, type: "open" | "close", attemptId: string, display?: string): Promise<BrowserStatus> {
  return fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, slug, attemptId, display }),
    keepalive: true,
    signal: AbortSignal.timeout(45_000),
  }).then(async (response): Promise<BrowserStatus> => {
    if (!response.ok) return "error";
    if (type === "close") return "unavailable";
    const { status } = await response.json();
    return status === "live" || status === "busy" ? status : "unavailable";
  }).catch(() => "error" as const);
}

function release(slug: string, attempt: Attempt) {
  if (attempt.closing) return;
  attempt.closing = true;
  void attempt.saved?.then(() => record(slug, "close", attempt.id));
}

export function SandboxBrowser({
  slug,
  title,
  url,
  nativeHref,
  className,
}: {
  slug: string;
  title: string;
  url: string;
  /** In-browser version of this mission, offered when no sandbox is free. */
  nativeHref?: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = useRef<Attempt | null>(null);
  const [status, setStatus] = useState<BrowserStatus>("assigning");
  const [streamProblem, setStreamProblem] = useState("");
  const [result, setResult] = useState<{ correct: boolean; xp: number } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement && dialog.current?.open) {
        dialog.current.close();
      }
    }

    function recordExit() {
      const attempt = active.current;
      if (attempt) release(slug, attempt);
    }

    function onPageHide() {
      recordExit();
      if (dialog.current?.open) dialog.current.close();
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("pagehide", onPageHide);
      recordExit();
    };
  }, [slug]);

  function save(attempt: Attempt) {
    setStatus("assigning");
    const savedAttempt = attempt.display.then((display) => record(slug, "open", attempt.id, display));
    attempt.saved = savedAttempt;
    void savedAttempt.then((saved) => {
      if (active.current === attempt) setStatus(saved);
    });
  }

  function openBrowser() {
    const frame = windowRef.current;
    if (!dialog.current || !frame || active.current) return;

    const id = crypto.randomUUID();
    dialog.current.showModal();
    const display = frame.requestFullscreen
      ? Promise.race([
          frame.requestFullscreen().then(() => "native" as const, () => "viewport" as const),
          new Promise<"viewport">((resolve) => window.setTimeout(() => resolve("viewport"), 1_000)),
        ])
      : Promise.resolve("viewport" as const);
    const attempt = { id, display };
    active.current = attempt;
    setAttemptId(id);
    setResult(null);
    save(attempt);
  }

  function closeBrowser() {
    const attempt = active.current;
    if (!attempt) return;
    active.current = null;
    setAttemptId(null);
    if (document.fullscreenElement === windowRef.current) {
      void document.exitFullscreen().catch(() => {});
    }
    trigger.current?.focus();
    release(slug, attempt);
  }

  return (
    <section className={cn("rounded-3xl bg-paper-raised p-6", className)}>
      <p className="text-lg font-bold">Your own browser, in a box.</p>
      <p className="mt-1 max-w-lg text-ink-soft">
        Each session gets a temporary browser isolated from your device and accounts.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button ref={trigger} onClick={openBrowser}>
          Open fullscreen browser
        </Button>
        {nativeHref && (
          <a href={nativeHref} className={buttonStyles({ variant: "secondary" })}>
            Play in this tab instead
          </a>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-label={`${title} sandbox browser`}
        onClose={closeBrowser}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-paper text-ink"
      >
        <div ref={windowRef} className="flex h-full w-full flex-col bg-paper text-ink">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-paper-deep px-3 py-2 sm:px-5">
            <div className="min-w-0">
              <p className="truncate font-bold">{title}</p>
              <p className="truncate font-mono text-sm text-ink-soft">{url}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://www.google.com/" target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "raised", size: "sm" })}>Browse web ↗</a>
              <span role="status" className="rounded-full bg-brand-soft px-3 py-1 text-sm font-bold">
                {status === "live" ? "Live" : status === "assigning" ? "Starting" : status === "busy" ? "Busy" : "Offline"}
              </span>
              <Button variant="raised" size="sm" className="h-11" onClick={() => dialog.current?.close()}>
                Exit game
              </Button>
            </div>
          </div>
          {status === "live" && attemptId ? (
            <>
              <SandboxViewport
                attemptId={attemptId}
                onEnd={(message) => {
                  setStreamProblem(message);
                  setStatus("ended");
                }}
                onResult={setResult}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 bg-paper-raised px-4 py-2 text-sm text-ink-soft">
                <p>Click the Chromium window to use it. Shift+Tab returns to the game controls.</p>
                {result && <p role="status" className="font-bold text-ink">{`Mission complete · ${result.xp} XP`}</p>}
              </div>
            </>
          ) : (
            <div className="relative grid min-h-0 flex-1 place-items-center overflow-auto p-4">
              <Scales size={14} />
              {status === "assigning" ? (
                <div className="relative flex w-full flex-col items-center gap-4">
                  <SandboxBoot slug={slug} />
                  <Button variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button>
                </div>
              ) : (
              <div className="relative max-w-md rounded-3xl bg-paper-raised p-6 text-center sm:p-9">
                <h2 className="text-3xl font-bold tracking-tight">
                  {status === "busy" ? "All six browsers are busy." : status === "ended" ? "Sandbox connection ended." : "No browser available."}
                </h2>
                <p className="mt-3 text-ink-soft">
                  {status === "ended" ? streamProblem : "Try again in a moment, or close this window to return to the mission."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {status === "ended" && (
                    <Button variant="secondary" onClick={() => setStatus("live")}>Reconnect video</Button>
                  )}
                  {status !== "ended" && (
                    <Button variant="secondary" onClick={() => active.current && save(active.current)}>
                      Try again
                    </Button>
                  )}
                  {nativeHref && (
                    <a href={nativeHref} className={buttonStyles()}>Play in this tab</a>
                  )}
                  <Button variant={nativeHref ? "secondary" : "primary"} onClick={() => dialog.current?.close()}>Close browser</Button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      </dialog>
    </section>
  );
}
