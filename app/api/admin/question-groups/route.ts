import { NextResponse } from "next/server";
import { auditLog, requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "@/lib/questions/repo";
import { GROUP_TYPES, type GroupType } from "@/lib/questions/types";

export async function POST(request: Request) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();

  let body: { group_type?: GroupType; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const groupType = body.group_type;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!GROUP_TYPES.includes(groupType as GroupType)) {
    return NextResponse.json({ error: "Invalid group_type." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  if (content.length > 20000) {
    return NextResponse.json({ error: "content exceeds 20000 characters." }, { status: 400 });
  }

  const { id, error } = await createGroup(db, { group_type: groupType as GroupType, content });
  if (error || !id) {
    return NextResponse.json({ error: error?.message ?? "Create failed." }, { status: 500 });
  }
  await auditLog(db, "CREATE_GROUP", "question_group", id);
  return NextResponse.json({ id });
}