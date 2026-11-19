"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { completeAccountCode, createAccount, normalizeEmail, requestAccountCode, validPassword, verifyAccount } from "@/lib/accounts";
import { getGameDestination } from "@/lib/games";

export async function submitAccount(
  mode: "sign-in" | "sign-up",
  destination: string,
  _previous: { error: string },
  data: FormData,
) {
  const redirectTo = getGameDestination(destination);
  const session = await auth();
  if (session?.user.id && session.sessionId) redirect(redirectTo);

  const email = normalizeEmail(data.get("email"));
  const password = data.get("password");
  if (!email || !validPassword(password)) {
    return { error: "Enter a valid email and a password of 12 to 128 characters." };
  }

  const verifyDestination = `/verify-email?next=${encodeURIComponent(redirectTo)}`;
  if (mode === "sign-up") {
    try {
      if (!(await createAccount(email, password)) && !(await verifyAccount(email, password, true))?.pending) {
        return { error: "Couldn’t create an account with those details. Try signing in or resetting your password." };
      }
      await requestAccountCode(email, "verify");
    } catch {
      return { error: "We couldn’t send a verification code. Try again in a moment." };
    }
    redirect(verifyDestination);
  }

  try {
    await signIn("credentials", { email, password, redirectTo });
    return { error: "" };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin" && (await verifyAccount(email, password, true))?.pending) {
        redirect(verifyDestination);
      }
      return {
        error: error.type === "CredentialsSignin"
          ? "Email or password is incorrect."
          : "Sign-in is temporarily unavailable. Try again in a moment.",
      };
    }
    throw error;
  }
}

export async function leaveAccount() {
  await signOut({ redirectTo: "/" });
}


export async function submitAccountCode(
  purpose: "verify" | "reset",
  destination: string,
  _previous: { error: string; notice?: string },
  data: FormData,
) {
  const email = normalizeEmail(data.get("email"));
  const password = data.get("password");
  const action = data.get("intent");

  if (!email) return { error: "Enter a valid email address." };

  if (action === "send") {
    if (purpose === "verify" && !validPassword(password)) {
      return { error: "Enter the password you chose when you signed up." };
    }
    try {
      if (purpose === "reset" || (typeof password === "string" && (await verifyAccount(email, password, true))?.pending)) {
        await requestAccountCode(email, purpose);
      }
    } catch {
      console.error("Could not send authentication code");
      if (purpose === "verify") return { error: "We couldn’t send a code. Try again in a moment." };
    }
    return { error: "", notice: "If the address is eligible, check your inbox for a code." };
  }

  const code = data.get("code");
  if (!validPassword(password) || typeof code !== "string" || !/^\d{8}$/.test(code)) {
    return { error: "Enter the eight-digit code and a password of 12 to 128 characters." };
  }

  try {
    if (!(await completeAccountCode(email, purpose, code, password))) {
      return { error: "The code or account details don’t match, or the code has expired." };
    }
  } catch {
    return { error: "We couldn’t finish that request. Try again in a moment." };
  }

  const query = new URLSearchParams({
    next: getGameDestination(destination),
    result: purpose === "reset" ? "password-reset" : "email-verified",
  });
  redirect(`/sign-in?${query}`);
}
