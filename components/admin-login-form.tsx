"use client";

import { useActionState } from "react";
import { completeAdminLogin, restartAdminLogin, startAdminLogin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminLoginForm({ codeStep, email, className }: {
  codeStep: boolean;
  email: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState(codeStep ? completeAdminLogin : startAdminLogin, { error: "" });
  const input = "depth-sunken mt-2 block h-12 w-full rounded-2xl bg-paper-deep px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep";

  return (
    <section className={cn("w-full max-w-md rounded-3xl bg-paper-raised p-5 sm:p-8", className)}>
      <h1 className="text-4xl font-bold tracking-tight">{codeStep ? "Enter your admin code" : "Admin sign-in"}</h1>
      <p className="mt-3 text-ink-soft">
        {codeStep ? `We sent an eight-digit code to ${email}. It expires in 10 minutes.` : `Use the PHISH//OUT account password for ${email}.`}
      </p>
      <form action={action} className="mt-6 grid gap-4">
        {codeStep ? (
          <label className="font-bold">One-time code
            <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required className={cn(input, "font-mono tracking-widest")} />
          </label>
        ) : (
          <label className="font-bold">Password
            <input name="password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required className={input} />
          </label>
        )}
        {state.error && <p role="alert" className="rounded-2xl bg-brand-soft p-3 text-sm">{state.error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Checking…" : codeStep ? "Verify code" : "Email me a code"}</Button>
      </form>
      {codeStep && (
        <form action={restartAdminLogin} className="mt-3">
          <Button type="submit" variant="secondary">Start over</Button>
        </form>
      )}
    </section>
  );
}
