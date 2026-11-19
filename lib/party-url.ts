import { headers } from "next/headers";

/** The address people should open to join, from the host the page was served on (so it works on a LAN IP too). */
export async function joinUrl(code: string) {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "phishout.folioo.tech";
  const local = host.startsWith("localhost") || /^\d/.test(host);
  const proto = list.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}/party/${code}`;
}
