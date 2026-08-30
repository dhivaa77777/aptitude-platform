import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { getProfile, isAdminRole, type Profile } from "@/lib/supabase/server";

export class AdminAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) throw new AdminAccessError("Unauthorized", 401);
  if (!isAdminRole(profile.role)) {
    throw new AdminAccessError("Forbidden: admin role required", 403);
  }
  return profile;
}

export async function requireAdminRoute(): Promise<Profile | NextResponse> {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function auditLog(
  db: SupabaseClient<Database>,
  action: string,
  targetType: string,
  targetId: string | null,
) {
  const { error } = await db.rpc("log_admin_action", {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
  });
  return error;
}