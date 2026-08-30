import { NextResponse } from "next/server";
import { requireLearnerRoute } from "@/lib/learner";
import { createClient } from "@/lib/supabase/server";
import { listPracticeTags } from "@/lib/practice/repo";

export async function GET() {
  const guard = await requireLearnerRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  const tags = await listPracticeTags(db);
  return NextResponse.json(tags);
}