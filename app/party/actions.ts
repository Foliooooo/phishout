"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DURATIONS, createParty, endParty, joinParty, normalizeCode, partyMissions } from "@/lib/party";

export async function createPartyAction(form: FormData) {
  const session = await auth();
  if (!session?.user.id) redirect("/sign-in?next=%2Fparty");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 40) || "LAN party";
  const hours = Number(form.get("hours"));
  const missions = form.getAll("missions").map(String).filter(slug => partyMissions.some(game => game.slug === slug));
  if (!missions.length) redirect("/party?error=missions");
  const code = await createParty(session.user.id, name, missions, (DURATIONS as readonly number[]).includes(hours) ? hours : 2);
  redirect(`/party/${code}`);
}

export async function joinPartyAction(form: FormData) {
  const code = normalizeCode(form.get("code"));
  if (!code) redirect("/party?error=code");
  const session = await auth();
  if (!session?.user.id) redirect(`/sign-in?next=${encodeURIComponent(`/party/${code}`)}`);
  if (!await joinParty(code, session.user.id)) redirect(`/party?error=closed&code=${code}`);
  redirect(`/party/${code}`);
}

export async function endPartyAction(form: FormData) {
  const code = normalizeCode(form.get("code"));
  const session = await auth();
  if (code && session?.user.id) await endParty(code, session.user.id);
  redirect(code ? `/party/${code}` : "/party");
}
