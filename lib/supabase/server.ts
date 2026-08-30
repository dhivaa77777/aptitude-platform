import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import type { Role } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Invoked from a Server Component outside a Server Action / Route
          // Handler — Safe to ignore; the proxy refreshes sessions already.
        }
      },
    },
  });
}

export type Profile = Database["public"]["Tables"]["users"]["Row"];

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Returns the current user's profile row (own row only, via RLS). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}

/** Role-based post-authentication routing (one login screen, three roles). */
export function routeForRole(role: Role | null | undefined): string {
  switch (role) {
    case "ADMIN":
    case "MASTER_ADMIN":
      return "/admin";
    case "LEARNER":
      return "/home";
    default:
      return "/login";
  }
}

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "ADMIN" || role === "MASTER_ADMIN";
}