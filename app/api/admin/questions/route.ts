import { NextResponse } from "next/server";
import { auditLog, requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { validateQuestion } from "@/lib/questions/validation";
import { createQuestion } from "@/lib/questions/repo";
import type { QuestionInput } from "@/lib/questions/types";

export async function POST(request: Request) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  let input: QuestionInput;
  try {
    input = { group_id: null, ...(await request.json()) };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof input.group_id !== "string") input.group_id = null;
  input.explanation = typeof input.explanation === "string" ? input.explanation : "";

  const errors = validateQuestion(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed.", details: errors }, { status: 400 });
  }

  const { id, error } = await createQuestion(db, input);
  if (error || !id) {
    return NextResponse.json({ error: error?.message ?? "Create failed." }, { status: 500 });
  }
  await auditLog(db, "CREATE_QUESTION", "question", id);
  return NextResponse.json({ id });
}