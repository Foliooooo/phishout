"use client";

import { cn } from "@/lib/utils";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from "react";

const mime = 'video/mp4; codecs="avc1.42c01f"';

type SandboxResult = { correct: boolean; xp: number };

function sourceReady(target: EventTarget, event: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    function clean() {
      target.removeEventListener(event, success);
      target.removeEventListener("error", fail);
      signal.removeEventListener("abort", fail);
    }
    function success() { clean(); resolve(); }
    function fail() { clean(); reject(new Error("Video buffer closed")); }
    if (signal.aborted) return fail();
    target.addEventListener(event, success, { once: true });
    target.addEventListener("error", fail, { once: true });
    signal.addEventListener("abort", fail, { once: true });
  });
}

export function SandboxViewport({ attemptId, onEnd, onResult, className }: {
  attemptId: string;
  onEnd: (message: string) => void;
  onResult: (result: SandboxResult) => void;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const lastMove = useRef(0);
  const moving = useRef(false);
  const queue = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const finished = useEffectEvent(onEnd);
  const endpoint = `/api/sandbox/${attemptId}`;

  useEffect(() => {
    const screen = video.current;
    if (!screen) return;
    const abort = new AbortController();

    if (!("MediaSource" in window) || !MediaSource.isTypeSupported(mime)) {
      void Promise.resolve().then(() => {
        if (!abort.signal.aborted) setSupported(false);
      });
      return () => abort.abort();
    }

    let problem = "The video connection dropped. Reconnect to the same browser, or close it and start again.";
    const startupTimer = window.setTimeout(() => {
      abort.abort();
      finished("The browser opened, but video didn’t start. Try reconnecting.");
    }, 8_000);
    function started() { window.clearTimeout(startupTimer); }
    screen.addEventListener("playing", started, { once: true });

    const media = new MediaSource();
    const source = URL.createObjectURL(media);
    const opened = sourceReady(media, "sourceopen", abort.signal);
    screen.src = source;

    async function playStream(element: HTMLVideoElement) {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        await opened;
        const buffer = media.addSourceBuffer(mime);
        const reply = await fetch(endpoint, { signal: abort.signal, cache: "no-store" });
        if (!reply.ok || !reply.body) {
          if (reply.status === 401) problem = "Your sign-in expired. Close the sandbox and sign in again.";
          if (reply.status === 404) problem = "This browser has expired. Close it and start a fresh one.";
          if (reply.status === 409) problem = "The previous video connection is still closing. Wait a moment and reconnect.";
          throw new Error("Video unavailable");
        }
        reader = reply.body.getReader();

        while (!abort.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          const appended = sourceReady(buffer, "updateend", abort.signal);
          buffer.appendBuffer(new Uint8Array(value));
          await appended;
          const length = buffer.buffered.length;
          if (!length) continue;
          const edge = buffer.buffered.end(length - 1);
          const lag = edge - element.currentTime;
          if (lag > 0.48) element.currentTime = edge - 0.17;
          element.playbackRate = lag > 0.27 && lag <= 0.48 ? 1.10 : 1;
          if (element.paused) void element.play().catch(() => {});
          if (element.currentTime - buffer.buffered.start(0) > 8) {
            const trimmed = sourceReady(buffer, "updateend", abort.signal);
            buffer.remove(0, element.currentTime - 3);
            await trimmed;
          }
        }
      } catch {
        // A dropped stream is reported through the browser's ended state.
      } finally {
        void reader?.cancel().catch(() => {});
        if (!abort.signal.aborted) finished(problem);
      }
    }

    void playStream(screen);
    return () => {
      abort.abort();
      window.clearTimeout(startupTimer);
      screen.removeEventListener("playing", started);
      screen.removeAttribute("src");
      screen.load();
      URL.revokeObjectURL(source);
    };
  }, [endpoint]);

  async function send(event: object) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (response.ok && response.status !== 204) {
        const result = await response.json();
        if (typeof result.correct === "boolean") onResult(result);
      }
    } catch {
      // The video stream reports connection failures.
    }
  }

  function enqueue(event: object) {
    queue.current = queue.current.then(() => send(event));
  }

  function position(event: { currentTarget: HTMLVideoElement; clientX: number; clientY: number }) {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(box.width / 1280, box.height / 720);
    const x = Math.floor((event.clientX - box.left - (box.width - 1280 * scale) / 2) / scale);
    const y = Math.floor((event.clientY - box.top - (box.height - 720 * scale) / 2) / scale);
    return x >= 0 && x < 1280 && y >= 0 && y < 720 ? { x, y } : null;
  }

  function move(event: PointerEvent<HTMLVideoElement>) {
    if (!ready || moving.current || performance.now() - lastMove.current < 90) return;
    const point = position(event);
    if (!point) return;
    lastMove.current = performance.now();
    moving.current = true;
    void send({ type: "move", ...point }).finally(() => { moving.current = false; });
  }

  return (
    <div className={cn("relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-ink text-paper", className)}>
      <video
        ref={video}
        width={1280}
        height={720}
        muted
        autoPlay
        playsInline
        disablePictureInPicture
        tabIndex={0}
        aria-label="Live Chromium window. Focus to send keyboard input to the VM."
        className="absolute inset-0 h-full w-full touch-manipulation object-contain focus-visible:outline-2 focus-visible:outline-brand"
        onPlaying={() => setReady(true)}
        onPointerMove={move}
        onClick={(event) => {
          event.currentTarget.focus();
          const point = position(event);
          if (ready && point) enqueue({ type: "click", ...point });
        }}
        onWheel={(event) => {
          const point = position(event);
          if (ready && point) enqueue({ type: "wheel", ...point, delta: Math.round(Math.max(-720, Math.min(720, event.deltaY))) });
        }}
        onKeyDown={(event) => {
          if (!ready || event.metaKey || event.key === "Escape" || (event.shiftKey && event.key === "Tab")) return;
          if (event.key.length === 1 || ["Tab", "Enter", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault();
            enqueue({ type: "key", key: event.key, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey });
          }
        }}
      />
      {!ready && (
        <p role="status" className="pointer-events-none relative p-4 text-center">
          {supported ? "Connecting live video…" : "This browser can’t play the sandbox video. Open PHISH//OUT in a browser that supports H.264 Media Source Extensions."}
        </p>
      )}
    </div>
  );
}
