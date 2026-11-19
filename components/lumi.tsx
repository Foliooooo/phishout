"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

export type LumiMood = "chill" | "suspicious" | "nope";

const INK = "#2b1d24";
const PINK = "#ff5fa2";
const DEEP = "#e63d85";
const SOFT = "#ffd3e4";
const GLOW = "#ffe27a";
const TAPE = "#f3e2b8";

// Eye position in the 320×260 viewBox, used to aim the pupil at the pointer.
const EYE = { x: 132, y: 104 };

/**
 * Lumi, the PHISH//OUT angler fish. Anglers lure prey with a glowing bait;
 * Lumi gave that up and now shows people how the trick works.
 *
 * - The pupil follows the pointer.
 * - `talking` flaps the jaw.
 * - `lure="mail"` turns the glowing bait into an envelope (the phishing trick).
 */
export function Lumi({
  mood = "chill",
  talking = false,
  lure = "light",
  className,
  label,
}: {
  mood?: LumiMood;
  talking?: boolean;
  lure?: "light" | "mail";
  className?: string;
  label?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const still = useReducedMotion();
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = svg.current?.getBoundingClientRect();
        if (!box) return;
        const dx = event.clientX - (box.left + (EYE.x / 320) * box.width);
        const dy = event.clientY - (box.top + (EYE.y / 260) * box.height);
        const length = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, length / 200) * 8;
        setLook({ x: (dx / length) * reach, y: (dy / length) * reach });
      });
    };
    window.addEventListener("pointermove", move);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); };
  }, []);

  // Suspicious and alarmed, Lumi stares at the lure rather than the pointer.
  const pupil = mood === "chill" ? look : { x: -6, y: -7 };
  const spring = { type: "spring" as const, stiffness: 220, damping: 18 };
  // Tapping the lure flips it to the phishing email it really is, for a moment.
  const [peeking, setPeeking] = useState(false);
  const peekTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  function peek() {
    window.clearTimeout(peekTimer.current);
    setPeeking(true);
    peekTimer.current = window.setTimeout(() => setPeeking(false), 2200);
  }
  const shown = peeking ? (lure === "light" ? "mail" : "light") : lure;
  const jawOpen = mood === "nope" ? 0.15 : mood === "suspicious" ? 0.45 : 1;

  return (
    <svg
      ref={svg}
      viewBox="0 0 320 260"
      className={cn("h-full w-full overflow-visible", className)}
      role="img"
      aria-label={label ?? "Lumi, a pink angler fish with a glowing lure"}
    >
      <defs>
        <clipPath id={`${id}-body`}><path d="M66 140C66 78 120 44 186 46C250 48 286 96 284 146C282 200 236 228 176 226C112 224 66 196 66 140Z" /></clipPath>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={GLOW} stopOpacity="0.9" />
          <stop offset="1" stopColor={GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>

      <motion.g
        initial={false}
        animate={{ x: mood === "nope" ? 16 : 0, rotate: mood === "nope" ? 6 : mood === "suspicious" ? -3 : 0, y: still ? 0 : [0, -5, 0] }}
        transition={{ x: spring, rotate: spring, y: { duration: 2.8, repeat: Infinity, ease: "easeInOut" } }}
        style={{ originX: 0.5, originY: 0.5 }}
      >
        {/* Tail and fins behind the body. */}
        <motion.path
          d="M276 140L314 96Q302 140 314 188Z"
          fill={DEEP} stroke={INK} strokeWidth="5" strokeLinejoin="round"
          animate={still ? undefined : { rotate: [0, 8, 0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: 0, originY: 0.48 }}
        />
        <path d="M186 50l10-26 14 24 12-20 10 26" fill={DEEP} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M150 220Q170 252 200 224Z" fill={DEEP} stroke={INK} strokeWidth="5" strokeLinejoin="round" />

        {/* Body, belly, spots and the // brand marks. */}
        <path d="M66 140C66 78 120 44 186 46C250 48 286 96 284 146C282 200 236 228 176 226C112 224 66 196 66 140Z" fill={PINK} />
        <g clipPath={`url(#${id}-body)`}>
          <ellipse cx="180" cy="222" rx="130" ry="56" fill={SOFT} />
          <path d="M226 84l-18 50M248 84l-18 50" stroke={INK} strokeWidth="8" strokeLinecap="round" opacity="0.85" />
          {[[200, 160, 4], [222, 174, 3], [244, 158, 5], [262, 128, 3]].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={GLOW} stroke={INK} strokeWidth="2" />
          ))}
        </g>
        <path d="M66 140C66 78 120 44 186 46C250 48 286 96 284 146C282 200 236 228 176 226C112 224 66 196 66 140Z" fill="none" stroke={INK} strokeWidth="5" />

        {/* Jaw: a wide underbite with small, friendly teeth. Opens and closes. */}
        <motion.g
          initial={false}
          animate={talking && !still ? { scaleY: [jawOpen, jawOpen * 0.7, jawOpen] } : { scaleY: jawOpen }}
          transition={talking && !still ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
          style={{ originX: 0.5, originY: 0 }}
        >
          <path d="M70 146Q112 150 168 150Q150 196 98 188Q76 176 70 146Z" fill={INK} />
          <path d="M84 150l6 12 6-12M104 150l6 12 6-12M124 150l6 12 6-12M144 150l6 11 6-11" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M96 186l5-11 5 11M120 184l5-12 5 12" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M120 176q14 8 26-6" fill="none" stroke={DEEP} strokeWidth="6" strokeLinecap="round" />
        </motion.g>
        <path d="M66 146Q112 152 172 150" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />

        {/* Eye with tracking pupil, eyelid and brow. */}
        <circle cx={EYE.x} cy={EYE.y} r="24" fill="#fff" stroke={INK} strokeWidth="5" />
        <motion.g animate={{ x: pupil.x, y: pupil.y }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
          <circle cx={EYE.x} cy={EYE.y} r="11" fill={INK} />
          <circle cx={EYE.x - 4} cy={EYE.y - 5} r="3.5" fill="#fff" />
        </motion.g>
        <motion.path
          d="M107 104a25 25 0 0 1 50 0Z"
          fill={PINK} stroke={INK} strokeWidth="5" strokeLinejoin="round"
          initial={false}
          animate={{ scaleY: mood === "suspicious" ? 1 : 0, opacity: mood === "suspicious" ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ originX: 0.5, originY: 0 }}
        />
        <motion.path
          fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round"
          initial={false}
          animate={{ d: mood === "chill" ? "M110 70Q132 60 154 68" : mood === "suspicious" ? "M108 72Q132 76 156 62" : "M110 62Q132 46 154 60" }}
          transition={{ duration: 0.3 }}
        />
        <ellipse cx="166" cy="128" rx="11" ry="5" fill={DEEP} opacity="0.5" />

        {/* Side fin. */}
        <motion.path
          d="M196 152Q228 160 236 186Q210 184 196 168Z"
          fill={DEEP} stroke={INK} strokeWidth="4.5" strokeLinejoin="round"
          animate={still ? undefined : { rotate: [0, 12, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ originX: 0, originY: 0.15 }}
        />

        {/* Worried sweat drop. */}
        <motion.path
          d="M172 52q8 12 0 18q-8-6 0-18z" fill="#7ce2fe" stroke={INK} strokeWidth="2.5"
          initial={false}
          animate={{ opacity: mood === "nope" ? 1 : 0, y: mood === "nope" ? 0 : -8 }}
        />

        {/* The lure: a stalk from the forehead with a glowing bulb, or an envelope. */}
        <motion.g
          animate={still ? undefined : { rotate: [0, -6, 0, 4, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: 0.98, originY: 1 }}
        >
          <path d="M122 58Q114 4 60 10" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <motion.circle
            cx="48" cy="26" r="38" fill={`url(#${id}-glow)`}
            initial={false}
            animate={{ opacity: shown === "light" ? (still ? 0.8 : [0.55, 1, 0.55]) : 0, scale: still ? 1 : [0.92, 1.08, 0.92] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.g initial={false} animate={{ opacity: shown === "light" ? 1 : 0, scale: shown === "light" ? 1 : 0.4 }}>
            <circle cx="48" cy="26" r="16" fill={GLOW} stroke={INK} strokeWidth="4" />
            <circle cx="42" cy="20" r="4" fill="#fff" />
          </motion.g>
          <motion.g initial={false} animate={{ opacity: shown === "mail" ? 1 : 0, scale: shown === "mail" ? 1 : 0.4, rotate: shown === "mail" ? -8 : 0 }}>
            <rect x="26" y="12" width="44" height="30" rx="5" fill="#fff" stroke={INK} strokeWidth="3.5" />
            <path d="M28 15l20 14 20-14" fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="56" y="17" width="9" height="10" rx="1.5" fill={PINK} />
          </motion.g>
          <circle
            cx="48" cy="26" r="30" fill="transparent"
            role="button" tabIndex={0} aria-label="Tap the lure to see what it really is"
            className="cursor-pointer outline-none"
            onClick={peek}
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); peek(); } }}
          />
        </motion.g>
        {/* Tape holding the lure onto Lumi's head. */}
        <g aria-hidden>
          <path d="M106 50l30 12-3 8-30-12z" fill={TAPE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M108 66l24-18 5 6-24 18z" fill={TAPE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M116 57l3 2M124 60l3 2" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </g>
      </motion.g>
    </svg>
  );
}
