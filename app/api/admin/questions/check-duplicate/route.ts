import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { isDuplicateText, normalizeText } from "@/lib/questions/duplicates";

export async function POST(request: Request) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  let body: { question_text?: string; exclude_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const text = typeof body.question_text === "string" ? body.question_text : "";
  if (!text.trim()) {
    return NextResponse.json({ duplicate: false });
  }
  let query = db.from("questions").select("id, question_text");
  if (typeof body.exclude_id === "string" && body.exclude_id) {
    query = query.neq("id", body.exclude_id);
  }
  const { data } = await query;
  const existing = new Set((data ?? []).map((q) => normalizeText(q.question_text)));
  const duplicate = isDuplicateText(text, existing);
  return NextResponse.json({ duplicate });
}