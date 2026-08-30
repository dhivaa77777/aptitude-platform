import { redirect } from "next/navigation";
import { createClient, getProfile, routeForRole } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getProfile();
    redirect(routeForRole(profile?.role ?? null));
  }

  return <LoginForm />;
}