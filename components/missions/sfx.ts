"use client";

/** Tiny synthesized sound effects. No audio files, nothing loaded over the network. */

type Tone = { freq: number; at?: number; dur?: number; type?: OscillatorType; gain?: number; slide?: number };

const SOUNDS: Record<string, Tone[]> = {
  click: [{ freq: 520, dur: 0.04, type: "triangle", gain: 0.05 }],
  ding: [{ freq: 880, dur: 0.18, type: "sine", gain: 0.08 }, { freq: 1320, at: 0.08, dur: 0.24, type: "sine", gain: 0.06 }],
  tag: [{ freq: 300, dur: 0.06, type: "square", gain: 0.03, slide: 600 }],
  untag: [{ freq: 600, dur: 0.06, type: "square", gain: 0.03, slide: 300 }],
  reveal: [{ freq: 400, dur: 0.25, type: "sine", gain: 0.05, slide: 900 }],
  good: [
    { freq: 523, dur: 0.12, type: "triangle", gain: 0.07 },
    { freq: 659, at: 0.1, dur: 0.12, type: "triangle", gain: 0.07 },
    { freq: 784, at: 0.2, dur: 0.3, type: "triangle", gain: 0.07 },
  ],
  bad: [
    { freq: 220, dur: 0.25, type: "sawtooth", gain: 0.05, slide: 110 },
    { freq: 160, at: 0.18, dur: 0.35, type: "sawtooth", gain: 0.05, slide: 70 },
  ],
  tick: [{ freq: 1800, dur: 0.015, type: "square", gain: 0.02 }],
  alarm: [{ freq: 740, dur: 0.12, type: "square", gain: 0.035 }, { freq: 740, at: 0.2, dur: 0.12, type: "square", gain: 0.035 }],
  pop: [{ freq: 900, dur: 0.05, type: "sine", gain: 0.06, slide: 1400 }],
  send: [{ freq: 600, dur: 0.08, type: "sine", gain: 0.05, slide: 1100 }],
  win: [
    { freq: 523, dur: 0.14, type: "triangle", gain: 0.07 },
    { freq: 659, at: 0.12, dur: 0.14, type: "triangle", gain: 0.07 },
    { freq: 784, at: 0.24, dur: 0.14, type: "triangle", gain: 0.07 },
    { freq: 1047, at: 0.36, dur: 0.45, type: "triangle", gain: 0.08 },
  ],
};

export type Sound = keyof typeof SOUNDS;

let context: AudioContext | null = null;

export function isMuted() {
  try {
    return localStorage.getItem("phishout-sfx") === "off";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem("phishout-sfx", muted ? "off" : "on");
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

export function play(sound: Sound) {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    context ??= new AudioContext();
    const now = context.currentTime;
    for (const tone of SOUNDS[sound]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + (tone.at ?? 0);
      const end = start + (tone.dur ?? 0.1);
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.slide) osc.frequency.exponentialRampToValueAtTime(tone.slide, end);
      gain.gain.setValueAtTime(tone.gain ?? 0.05, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(context.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // Audio is decoration; never let it break the game.
  }
}
