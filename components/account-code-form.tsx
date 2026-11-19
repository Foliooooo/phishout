"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitAccountCode } from "@/app/account-actions";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const input = "depth-sunken mt-2 block h-12 w-full rounded-2xl bg-paper-deep px-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep";

export function AccountCodeForm({ purpose, next, className }: {
  purpose: "verify" | "reset";
  next: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState(submitAccountCode.bind(null, purpose, next), { error: "" });
  const [email, setEmail] = useState("");
  const verify = purpose === "verify";

  return (
    <section className={cn("w-full max-w-md rounded-3xl bg-paper-raised p-5 sm:p-8", className)}>
      <h1 className="text-4xl font-bold tracking-tight">{verify ? "Verify your email" : "Reset your password"}</h1>
      <p className="mt-3 text-ink-soft">
        {verify ? "Enter the code we sent and the password you chose when you signed up." : "Request a code, then enter it with a new password."}
      </p>
      {!verify && (
        <form action={action} className="mt-6 grid gap-3 rounded-2xl bg-paper-deep p-4">
          <label className="font-bold">Email
            <input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={cn(input, "bg-paper")} />
          </label>
          <Button type="submit" name="intent" value="send" variant="raised" disabled={pending}>Send reset code</Button>
        </form>
      )}
      <form action={action} className="mt-6 grid gap-4">
        {verify ? (
          <label className="font-bold">Email
            <input name="email" type="email" autoComplete="email" required maxLength={254} className={input} />
          </label>
        ) : <input type="hidden" name="email" value={email} />}
        <label className="font-bold">{verify ? "Verification code" : "Reset code"}
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required className={cn(input, "font-mono")} />
        </label>
        <label className="font-bold">{verify ? "Password" : "New password"}
          <input name="password" type="password" autoComplete={verify ? "current-password" : "new-password"} minLength={12} maxLength={128} required className={input} />
        </label>
        {state.error && <p role="alert" className="rounded-2xl bg-brand-soft p-3 text-sm text-ink">{state.error}</p>}
        {state.notice && <p role="status" className="rounded-2xl bg-brand-soft p-3 text-sm text-ink">{state.notice}</p>}
        <Button type="submit" name="intent" value="complete" disabled={pending}>
          {verify ? "Verify email" : "Save new password"}
        </Button>
        {verify && (
          <Button type="submit" name="intent" value="send" formNoValidate variant="secondary" disabled={pending}>Resend code</Button>
        )}
      </form>
      <Link href={{ pathname: "/sign-in", query: next ? { next } : undefined }} className={cn(buttonStyles({ variant: "raised" }), "mt-5")}>
        Back to sign in
      </Link>
    </section>
  );
}
