"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isAdminRole, routeForRole } from "@/lib/supabase/server";

export type AuthActionResult =
  | { ok: true; message?: string; redirect?: string; mfa?: "challenge" | "enroll" }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || profile.status === "SUSPENDED") {
    await supabase.auth.signOut();
    return { ok: false, error: "This account is suspended. Contact support." };
  }

  if (isAdminRole(profile.role)) {
    const { data: mfa } = await supabase.auth.mfa.listFactors();
    const hasVerifiedFactor = (mfa?.all ?? []).some(
      (f) => f.status === "verified" && f.factor_type === "totp",
    );

    if (!hasVerifiedFactor) {
      return { ok: true, mfa: "enroll" };
    }

    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      return { ok: true, mfa: "challenge" };
    }
  }

  return { ok: true, redirect: routeForRole(profile.role) };
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password || !name || !username) {
    return { ok: false, error: "All fields are required." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "Username must be 3-20 characters (letters, numbers, . _ -).",
    };
  }

  const supabase = await createClient();

  const { data: emailTaken } = await supabase.rpc("is_email_taken", { email });
  if (emailTaken) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const { data: usernameTaken } = await supabase.rpc("is_username_taken", {
    username,
  });
  if (usernameTaken) {
    return { ok: false, error: "This username is already taken." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, username } },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (
      lower.includes("already") ||
      error.status === 409 ||
      error.code === "23505"
    ) {
      return { ok: false, error: "That email or username is already taken." };
    }
    return { ok: false, error: error.message };
  }

  if (!data.session) {
    return {
      ok: true,
      message: "Check your inbox to confirm your email, then sign in.",
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user!.id)
    .maybeSingle();

  return { ok: true, redirect: routeForRole(profile?.role ?? "LEARNER") };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Called after a successful TOTP enrollment so the mirror flag stays accurate. */
export async function markMfaEnabled(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("users")
    .update({ mfa_enabled: true })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Could not update MFA status." };
  return { ok: true };
}

/** Post-MFA-resolution routing: fetch the profile and go to the role home. */
export async function redirectAfterAuth(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return redirect(routeForRole(profile?.role ?? null));
}