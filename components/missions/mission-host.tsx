"use client";

import { endlessGame, getGame } from "@/lib/games";
import { CrushSwitch } from "./crush-switch";
import { ScenePlayer, type Skin } from "./scene-player";
import { chatSkin } from "./surfaces/chat";
import { countdownSkin } from "./surfaces/countdown";
import { downloadSkin } from "./surfaces/downloads";
import { loginSkin } from "./surfaces/login";
import { mailSkin } from "./surfaces/mail";
import { newsSkin } from "./surfaces/news";
import { permissionSkin } from "./surfaces/permission";
import { twinSkin } from "./surfaces/twin";

const SKINS: Record<string, Skin> = {
  "inbox-trap": mailSkin,
  "link-inspector": newsSkin,
  "spot-the-lookalike": loginSkin,
  "double-trouble": twinSkin,
  "tick-tock": countdownSkin,
  "download-roulette": downloadSkin,
  "whos-the-boss": chatSkin,
  "popup-panic": permissionSkin,
};

/** Plays a mission directly in this browser tab. */
export function MissionHost({ slug }: { slug: string }) {
  const game = getGame(slug)!;
  if (slug === "crush-switch") return <CrushSwitch game={game} />;
  return <ScenePlayer game={game} skin={SKINS[slug]} />;
}

/** Endless mode: Gemini-written inbox missions in the mail app. */
export function EndlessHost() {
  return <ScenePlayer game={endlessGame} skin={mailSkin} />;
}
