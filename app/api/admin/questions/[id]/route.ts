import { NextResponse } from "next/server";
import { auditLog, requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  deleteQuestion,
  isQuestionReferenced,
  updateQuestion,
} from "@/lib/questions/repo";
import { validateQuestion } from "@/lib/questions/validation";
import type { QuestionInput } from "@/lib/questions/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  const { id } = await params;

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

  const { error } = await updateQuestion(db, id, input);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await auditLog(db, "UPDATE_QUESTION", "question", id);
  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  const { id } = await params;

  const referenced = await isQuestionReferenced(db, id);
  if (referenced) {
    return NextResponse.json(
      { error: "This question has appeared in an attempt. Disable it instead." },
      { status: 409 },
    );
  }

  const { error } = await deleteQuestion(db, id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await auditLog(db, "DELETE_QUESTION", "question", id);
  return NextResponse.json({ id });
}