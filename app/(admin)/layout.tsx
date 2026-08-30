import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient, getProfile, isAdminRole } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isAdminRole(profile.role)) redirect("/home");

  // Admin areas require a completed MFA (AAL2) session.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") redirect("/login/verify-mfa");

  return (
    <AppShell role={profile.role} name={profile.name}>
      {children}
    </AppShell>
  );
}