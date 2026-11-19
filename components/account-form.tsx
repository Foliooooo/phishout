"use client";

import { EyeOffIcon, EyeOnIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { submitAccount } from "@/app/account-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldStyle = "depth-sunken mt-2 block h-12 w-full rounded-2xl bg-paper-deep px-4 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep";

const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

export function AccountForm({
  mode,
  next,
  result,
  className,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  result?: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState(submitAccount.bind(null, mode, next), { error: "" });
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const joining = mode === "sign-up";
  const alternate = joining ? "/sign-in" : "/sign-up";

  useEffect(() => {
    if (!joining || !password) return;

    let current = true;
    void import("zxcvbn").then(({ default: estimate }) => {
      if (current) setScore(estimate(password).score);
    }).catch(() => {});
    return () => { current = false; };
  }, [joining, password]);

  return (
    <section className={cn("w-full max-w-sm", className)}>
      <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">{joining ? "Create an account" : "Sign in"}</h1>
      <p className="mt-3 text-ink-soft">{joining ? "Join the arcade to launch your sandbox." : "Pick up where you left off in the arcade."}</p>
      {!joining && (result === "email-verified" || result === "password-reset") && (
        <p role="status" className="mt-4 rounded-2xl bg-brand-soft p-3 text-sm font-bold text-ink">
          {result === "email-verified" ? "Email verified. You can sign in now." : "Password updated. Sign in with your new password."}
        </p>
      )}
      <form
        action={action}
        onSubmit={() => setVisible(false)}
        onReset={() => {
          setVisible(false);
          setPassword("");
          setScore(null);
        }}
        className="mt-8 grid gap-5"
      >
        <label className="font-bold">
          Email
          <input name="email" type="email" autoComplete="email" maxLength={254} required className={fieldStyle} />
        </label>
        <div>
          <label htmlFor="account-password" className="font-bold">Password</label>
          <div className="relative mt-2">
            <input
              id="account-password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete={joining ? "new-password" : "current-password"}
              minLength={12}
              maxLength={128}
              aria-describedby={joining ? "password-hint password-strength" : undefined}
              onChange={joining ? (event) => {
                const value = event.currentTarget.value;
                setPassword(value);
                if (!value) setScore(null);
              } : undefined}
              required
              className={cn(fieldStyle, "mt-0 pr-14")}
            />
            <Button
              type="button"
              variant="raised"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-controls="account-password"
              onClick={() => setVisible((previous) => !previous)}
              className="absolute inset-y-0 right-0.5 my-auto h-11 w-11 rounded-xl px-0"
            >
              <PikaIcon icon={visible ? EyeOffIcon : EyeOnIcon} size={20} aria-hidden />
            </Button>
          </div>
          {!joining && (
            <Link href={{ pathname: "/reset-password", query: next ? { next } : undefined }} className="inline-flex min-h-11 items-center text-sm font-bold text-ink underline decoration-brand decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-deep">
              Forgot password?
            </Link>
          )}
          {joining && (
            <div className="mt-3 space-y-2 text-sm font-medium text-ink-soft">
              <div aria-hidden className="grid grid-cols-5 gap-1">
                {strengthLabels.map((label, index) => (
                  <span
                    key={label}
                    className={cn(
                      "h-1.5 rounded-full bg-ink/15",
                      score !== null && index <= score && "bg-brand",
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <span id="password-hint">Use at least 12 characters.</span>
                <span id="password-strength" aria-live="polite" className="font-bold text-ink">
                  {score === null ? "Password strength" : `Strength: ${strengthLabels[score]}`}
                </span>
              </div>
            </div>
          )}
        </div>
        {state.error && <p role="alert" className="rounded-2xl bg-brand-soft p-3 text-sm text-ink">{state.error}</p>}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>{pending ? "One moment…" : joining ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        {joining ? "Already have an account? " : "New around here? "}
        <Link
          href={next ? { pathname: alternate, query: { next } } : alternate}
          className="inline-flex min-h-11 items-center rounded-sm font-bold text-ink underline decoration-brand decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-deep"
        >
          {joining ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </section>
  );
}
