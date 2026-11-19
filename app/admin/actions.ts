"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validPassword, verifyAccount } from "@/lib/accounts";
import {
  adminChallengeCookie, adminChallengeSeconds, adminEmail, adminSessionCookie, adminSessionSeconds,
  allowAdminPasswordAttempt, createAdminChallenge, discardAdminChallenge, hasAdminChallenge, revokeAdminSession, verifyAdminCode,
} from "@/lib/admin";
import { sendAuthCode } from "@/lib/email/auth-mail";

const cookieOptions = { path: "/admin", httpOnly: true, sameSite: "strict", secure: process.env.AUTH_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production" } as const;

export async function startAdminLogin(_state: { error: string }, form: FormData) {
  const password = form.get("password");
  if (!validPassword(password)) return { error: "Enter your admin account password." };
  try {
    if (!await allowAdminPasswordAttempt()) return { error: "Wait a few seconds and try again." };
    const account = await verifyAccount(adminEmail, password);
    if (!account) return { error: "That password couldn’t be verified." };
    const challenge = await createAdminChallenge(account.passwordVersion);
    if (!challenge) return { error: "A code was requested recently. Wait a minute and try again." };
    try {
      await sendAuthCode(adminEmail, challenge.code, "admin");
    } catch {
      await discardAdminChallenge(challenge.token);
      return { error: "We couldn’t send the admin code. Try again in a minute." };
    }
    (await cookies()).set(adminChallengeCookie, challenge.token, { ...cookieOptions, maxAge: adminChallengeSeconds });
  } catch {
    return { error: "Admin sign-in is temporarily unavailable." };
  }
  redirect("/admin");
}

export async function completeAdminLogin(_state: { error: string }, form: FormData) {
  const code = form.get("code");
  if (typeof code !== "string" || !/^\d{8}$/.test(code)) return { error: "Enter the eight-digit code." };
  const jar = await cookies();
  const token = jar.get(adminChallengeCookie)?.value;
  if (!token) redirect("/admin");
  try {
    const session = await verifyAdminCode(token, code);
    if (!session) {
      if (await hasAdminChallenge(token)) return { error: "That code didn’t match. Try again." };
      jar.set(adminChallengeCookie, "", { ...cookieOptions, maxAge: 0 });
    } else {
      jar.set(adminSessionCookie, session, { ...cookieOptions, maxAge: adminSessionSeconds });
      jar.set(adminChallengeCookie, "", { ...cookieOptions, maxAge: 0 });
    }
  } catch {
    return { error: "We couldn’t check the code. Try again." };
  }
  redirect("/admin");
}

export async function restartAdminLogin() {
  const jar = await cookies();
  const challenge = jar.get(adminChallengeCookie)?.value;
  const session = jar.get(adminSessionCookie)?.value;
  if (challenge) await discardAdminChallenge(challenge);
  if (session) await revokeAdminSession(session);
  jar.set(adminChallengeCookie, "", { ...cookieOptions, maxAge: 0 });
  jar.set(adminSessionCookie, "", { ...cookieOptions, maxAge: 0 });
  redirect("/admin");
}
