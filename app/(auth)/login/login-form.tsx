"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn, signUp, type AuthActionResult } from "./actions";

type Mode = "signin" | "signup";

const initial: AuthActionResult = { ok: true };

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [state, formAction, pending] = useActionState(
    (_prev: AuthActionResult, formData: FormData) =>
      mode === "signin" ? signIn(formData) : signUp(formData),
    initial,
  );

  useEffect(() => {
    if (!state.ok) return;
    if (state.mfa === "enroll") {
      router.push("/login/enroll-mfa");
    } else if (state.mfa === "challenge") {
      router.push("/login/verify-mfa");
    } else if (state.redirect) {
      router.push(state.redirect);
    }
  }, [state, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Aptitude</h1>
          <p className="mt-1 text-sm text-muted">Practice. Assess. Improve.</p>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                mode === "signin"
                  ? "bg-surface-1 text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                mode === "signup"
                  ? "bg-surface-1 text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          {state.ok && state.message ? (
            <div className="mt-4 rounded-lg border border-success bg-success/10 px-4 py-3 text-sm text-success">
              {state.message}
            </div>
          ) : (
            <form action={formAction} className="mt-4 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm text-foreground">
                      Full name
                    </label>
                    <Input id="name" name="name" placeholder="Your name" autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="username" className="text-sm text-foreground">
                      Username
                    </label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="3-20 characters, e.g. dhivaa77777"
                      autoComplete="username"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              {!state.ok && state.error && (
                <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>
          )}

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-center text-sm text-muted">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary-strong"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-primary-strong"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          Role routing and required MFA for admin accounts are handled
          automatically after sign-in.
        </p>
      </div>
    </main>
  );
}