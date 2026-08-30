import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeText } from "@/lib/questions/duplicates";
import type {
  GroupType,
  QuestionInput,
  QuestionStatus,
} from "@/lib/questions/types";

export type DbClient = SupabaseClient<Database>;

export interface QuestionResult {
  id: string | null;
  error: { message: string } | null;
}

export async function createQuestion(
  db: DbClient,
  input: QuestionInput,
): Promise<QuestionResult> {
  const {
    data: question,
    error: qerr,
  } = await db
    .from("questions")
    .insert({
      question_text: input.question_text,
      question_type: input.question_type,
      explanation: input.explanation || null,
      assigned_difficulty: input.assigned_difficulty,
      estimated_time_seconds: input.estimated_time_seconds,
      shuffle_options: input.shuffle_options,
      group_id: input.group_id,
      status: input.status,
    })
    .select("id")
    .single();

  if (qerr || !question) {
    return { id: null, error: qerr };
  }

  const { error: oerr } = await db
    .from("options")
    .insert(
      input.options.map((o) => ({
        question_id: question.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        display_order: o.display_order,
      })),
    );
  if (oerr) {
    await db.from("questions").delete().eq("id", question.id);
    return { id: null, error: oerr };
  }

  const { error: terr } = await db
    .from("question_tags")
    .insert(
      input.tags.map((t) => ({
        question_id: question.id,
        tag_type: t.tag_type,
        tag_value: t.tag_value,
      })),
    );
  if (terr) {
    await db.from("questions").delete().eq("id", question.id);
    return { id: null, error: terr };
  }

  return { id: question.id, error: null };
}

export async function updateQuestion(
  db: DbClient,
  id: string,
  input: QuestionInput,
): Promise<{ error: { message: string } | null }> {
  const { data: current } = await db
    .from("questions")
    .select("version")
    .eq("id", id)
    .maybeSingle();

  const {
    error: qerr,
  } = await db
    .from("questions")
    .update({
      question_text: input.question_text,
      question_type: input.question_type,
      explanation: input.explanation || null,
      assigned_difficulty: input.assigned_difficulty,
      estimated_time_seconds: input.estimated_time_seconds,
      shuffle_options: input.shuffle_options,
      group_id: input.group_id,
      status: input.status,
      version: (current?.version ?? 0) + 1,
    })
    .eq("id", id);
  if (qerr) return { error: qerr };

  const { data: oldOptionIds } = await db
    .from("options")
    .select("id")
    .eq("question_id", id);
  const { data: oldTagIds } = await db
    .from("question_tags")
    .select("id")
    .eq("question_id", id);

  const { data: newOptionIds, error: oerr } = await db
    .from("options")
    .insert(
      input.options.map((o) => ({
        question_id: id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        display_order: o.display_order,
      })),
    )
    .select("id");
  if (oerr) return { error: oerr };

  const { error: terr } = await db
    .from("question_tags")
    .insert(
      input.tags.map((t) => ({
        question_id: id,
        tag_type: t.tag_type,
        tag_value: t.tag_value,
      })),
    );
  if (terr) {
    await db
      .from("options")
      .delete()
      .in("id", (newOptionIds ?? []).map((o) => o.id));
    return { error: terr };
  }

  if ((oldOptionIds ?? []).length > 0) {
    await db
      .from("options")
      .delete()
      .in("id", (oldOptionIds ?? []).map((o) => o.id));
  }
  if ((oldTagIds ?? []).length > 0) {
    await db
      .from("question_tags")
      .delete()
      .in("id", (oldTagIds ?? []).map((t) => t.id));
  }

  return { error: null };
}

export async function setQuestionStatus(
  db: DbClient,
  id: string,
  status: QuestionStatus,
): Promise<{ error: { message: string } | null }> {
  const { error } = await db
    .from("questions")
    .update({ status })
    .eq("id", id);
  return { error };
}

export async function isQuestionReferenced(
  db: DbClient,
  id: string,
): Promise<boolean> {
  const { count } = await db
    .from("attempt_questions")
    .select("id", { count: "exact", head: true })
    .eq("question_id", id);
  return (count ?? 0) > 0;
}

export async function deleteQuestion(
  db: DbClient,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const { error } = await db.from("questions").delete().eq("id", id);
  return { error };
}

export async function getExistingNormalizedTexts(
  db: DbClient,
  excludeId?: string,
): Promise<Set<string>> {
  let query = db.from("questions").select("id, question_text");
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  const set = new Set<string>();
  (data ?? []).forEach((q) => set.add(normalizeText(q.question_text)));
  return set;
}

export async function createGroup(
  db: DbClient,
  group: { group_type: GroupType; content: string },
): Promise<QuestionResult> {
  const { data, error } = await db
    .from("question_groups")
    .insert({ group_type: group.group_type, content: group.content })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}

export async function updateGroup(
  db: DbClient,
  id: string,
  group: { group_type: GroupType; content: string },
): Promise<{ error: { message: string } | null }> {
  const { error } = await db
    .from("question_groups")
    .update({ group_type: group.group_type, content: group.content })
    .eq("id", id);
  return { error };
}

export async function isGroupReferenced(
  db: DbClient,
  id: string,
): Promise<boolean> {
  const { count } = await db
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("group_id", id);
  return (count ?? 0) > 0;
}

export async function deleteGroup(
  db: DbClient,
  id: string,
): Promise<{ error: { message: string } | null }> {
  const { error } = await db.from("question_groups").delete().eq("id", id);
  return { error };
}