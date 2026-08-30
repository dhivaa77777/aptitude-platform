import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient, getProfile } from "@/lib/supabase/server";

export default async function LearnerLayout({
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
  if (profile.role !== "LEARNER") redirect("/admin");

  return (
    <AppShell role={profile.role} name={profile.name}>
      {children}
    </AppShell>
  );
}