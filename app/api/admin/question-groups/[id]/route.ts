import { NextResponse } from "next/server";
import { auditLog, requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGroup,
  isGroupReferenced,
  updateGroup,
} from "@/lib/questions/repo";
import { GROUP_TYPES, type GroupType } from "@/lib/questions/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  const { id } = await params;

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

  const { error } = await updateGroup(db, id, {
    group_type: groupType as GroupType,
    content,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await auditLog(db, "UPDATE_GROUP", "question_group", id);
  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdminRoute();
  if (guard instanceof NextResponse) return guard;
  const db = await createClient();
  const { id } = await params;

  const referenced = await isGroupReferenced(db, id);
  if (referenced) {
    return NextResponse.json(
      { error: "This group is used by one or more questions. Remove those references first." },
      { status: 409 },
    );
  }

  const { error } = await deleteGroup(db, id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await auditLog(db, "DELETE_GROUP", "question_group", id);
  return NextResponse.json({ id });
}