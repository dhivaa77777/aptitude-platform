import { NextResponse } from "next/server";
import { getProfile, type Profile } from "@/lib/supabase/server";

export class LearnerAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function requireLearner(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) throw new LearnerAccessError("Unauthorized", 401);
  if (profile.role !== "LEARNER") {
    throw new LearnerAccessError("Forbidden: learner role required", 403);
  }
  if (profile.status !== "ACTIVE") {
    throw new LearnerAccessError("Forbidden: account suspended", 403);
  }
  return profile;
}

export async function requireLearnerRoute(): Promise<Profile | NextResponse> {
  try {
    return await requireLearner();
  } catch (e) {
    if (e instanceof LearnerAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}