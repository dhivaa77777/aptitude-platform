import { NextResponse } from "next/server";
import { auditLog, requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { setQuestionStatus } from "@/lib/questions/repo";
import { QUESTION_STATUSES, type QuestionStatus } from "@/lib/questions/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  const { id } = await params;

  let body: { status?: QuestionStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.status || !QUESTION_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { error } = await setQuestionStatus(db, id, body.status);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await auditLog(db, "SET_QUESTION_STATUS", "question", id);
  return NextResponse.json({ id, status: body.status });
}