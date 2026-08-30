"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { markMfaEnabled, redirectAfterAuth } from "../actions";

export default function EnrollMfaPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
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
      const alreadyVerified = (mfa?.all ?? []).some((f) => f.status === "verified");
      if (alreadyVerified) {
        router.replace("/login/verify-mfa");
        return;
      }
      await Promise.all(
        (mfa?.all ?? []).map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })),
      );
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Admin MFA",
      });
      if (enrollError || !data) {
        setError(enrollError?.message ?? "Could not start MFA setup.");
        return;
      }
      if (active) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
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
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error || !data) {
      setError("Incorrect code. Make sure your device clock is accurate.");
      setBusy(false);
      return;
    }
    const mark = await markMfaEnabled();
    if (!mark.ok) setError(mark.error ?? "Could not update MFA status.");
    await redirectAfterAuth();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Aptitude</h1>
          <p className="mt-1 text-sm text-muted">
            MFA is required for admin accounts
          </p>
        </div>
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Set up two-step verification</h2>
          <p className="mb-4 text-sm text-muted">
            1. Scan this QR code with an authenticator app (Google Authenticator,
            1Password, Authy…).
          </p>

          {qrCode ? (
            <div className="mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="TOTP enrollment QR code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
          ) : (
            <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-border bg-surface-2 text-sm text-muted">
              Generating…
            </div>
          )}

          {secret && (
            <p className="mt-3 text-center font-mono text-sm text-muted">
              {secret}
            </p>
          )}

          <p className="mb-2 mt-3 text-sm text-muted">
            2. Enter the 6-digit code shown in the app.
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
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={!factorId}
            />
            {error && (
              <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!factorId || busy || code.length !== 6}>
              {busy ? "Verifying…" : "Confirm and continue"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}