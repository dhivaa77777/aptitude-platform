"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { redirectAfterAuth } from "../actions";

export default function VerifyMfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: mfa } = await supabase.auth.mfa.listFactors();
      const verified = (mfa?.all ?? []).find(
        (f) => f.status === "verified" && f.factor_type === "totp",
      );
      if (!verified) {
        router.replace("/login");
        return;
      }
      if (active) {
        setFactorId(verified.id);
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function verify() {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) {
      setError("Incorrect code. Try again.");
      setBusy(false);
      return;
    }
    await redirectAfterAuth();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Aptitude</h1>
          <p className="mt-1 text-sm text-muted">Two-step verification</p>
        </div>
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Enter your code</h2>
          <p className="mb-4 text-sm text-muted">
            Open your authenticator app and enter the 6-digit code for Aptitude.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
            className="space-y-4"
          >
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              autoFocus
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={!ready}
            />
            {error && (
              <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!ready || busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}