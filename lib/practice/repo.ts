import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PracticeFilters } from "@/lib/practice/types";

export type DbClient = SupabaseClient<Database>;

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type OptionRow = Database["public"]["Tables"]["options"]["Row"];
type HistoryRow = Database["public"]["Tables"]["user_question_history"]["Row"];
type AttemptRow = Database["public"]["Tables"]["test_attempts"]["Row"];
type AttemptQuestionRow =
  Database["public"]["Tables"]["attempt_questions"]["Row"];

export interface LoadedQuestion {
  question: QuestionRow & {
    options: OptionRow[];
  };
  tags: Map<string, Set<string>>;
}

export function uniqueTagValues(rows: { tag_value: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const value = row.tag_value.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

export async function listPracticeTags(
  db: DbClient,
): Promise<{ fields: string[]; topics: string[] }> {
  const [fieldsRes, topicsRes] = await Promise.all([
    db.from("question_tags").select("tag_value").eq("tag_type", "FIELD"),
    db.from("question_tags").select("tag_value").eq("tag_type", "TOPIC"),
  ]);
  return {
    fields: uniqueTagValues(fieldsRes.data ?? []),
    topics: uniqueTagValues(topicsRes.data ?? []),
  };
}

interface QuestionWithOptions extends QuestionRow {
  options: OptionRow[];
}

export async function loadActiveMcqQuestions(
  db: DbClient,
): Promise<LoadedQuestion[]> {
  const { data: questions, error } = await db
    .from("questions")
    .select(
      "id, question_text, explanation, assigned_difficulty, shuffle_options, options(id, option_text, is_correct, display_order)",
    )
    .eq("status", "ACTIVE")
    .eq("question_type", "MCQ");
  if (error) return [];

  const { data: tags } = await db
    .from("question_tags")
    .select("question_id, tag_type, tag_value");

  const tagMap = new Map<string, Set<string>>();
  for (const t of tags ?? []) {
    const set = tagMap.get(t.question_id) ?? new Set<string>();
    if (t.tag_type === "FIELD" || t.tag_type === "TOPIC") {
      set.add(t.tag_value);
    }
    tagMap.set(t.question_id, set);
  }

  return (questions ?? []).map((q) => ({
    question: q as unknown as QuestionWithOptions,
    tags: tagMap,
  }));
}

export async function loadHistory(
  db: DbClient,
  userId: string,
): Promise<Map<string, HistoryRow>> {
  const { data } = await db
    .from("user_question_history")
    .select("question_id, last_seen_at, times_seen")
    .eq("user_id", userId);
  const map = new Map<string, HistoryRow>();
  for (const row of data ?? []) {
    map.set(row.question_id, { ...row, user_id: userId });
  }
  return map;
}

export function matchesFilters(
  loaded: LoadedQuestion,
  filters: PracticeFilters,
): boolean {
  const tags = loaded.tags.get(loaded.question.id);
  if (filters.field && !tags?.has(filters.field)) return false;
  if (filters.topic && !tags?.has(filters.topic)) return false;
  if (
    filters.difficulty !== null &&
    filters.difficulty !== undefined &&
    loaded.question.assigned_difficulty !== filters.difficulty
  ) {
    return false;
  }
  return true;
}

export async function createPracticeAttempt(
  db: DbClient,
  userId: string,
  filters: PracticeFilters,
  servedCount: number,
): Promise<string | null> {
  const config = {
    filters,
    served: servedCount,
    cutoffDays: 14,
  };
  const configJson = config as unknown as Database["public"]["Tables"]["test_attempts"]["Insert"]["configuration_json"];
  const { data, error } = await db
    .from("test_attempts")
    .insert({
      user_id: userId,
      mode: "PRACTICE",
      configuration_json: configJson,
      status: "IN_PROGRESS",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function insertAttemptQuestion(
  db: DbClient,
  input: {
    attemptId: string;
    questionId: string;
    displayOrder: number;
    optionOrderSeed: number;
    correctOptionId: string;
  },
): Promise<string | null> {
  const { data, error } = await db
    .from("attempt_questions")
    .insert({
      attempt_id: input.attemptId,
      question_id: input.questionId,
      display_order: input.displayOrder,
      option_order_seed: input.optionOrderSeed,
      correct_option_id_snapshot: input.correctOptionId,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function touchQuestionHistory(
  db: DbClient,
  userId: string,
  questionId: string,
  timesSeen: number,
): Promise<boolean> {
  const { error } = await db.from("user_question_history").upsert(
    {
      user_id: userId,
      question_id: questionId,
      last_seen_at: new Date().toISOString(),
      times_seen: timesSeen,
    },
    { onConflict: "user_id,question_id" },
  );
  return !error;
}

export async function getOwnAttempt(
  db: DbClient,
  userId: string,
  attemptId: string,
): Promise<AttemptRow | null> {
  const { data } = await db
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data;
}

export async function getAttemptQuestions(
  db: DbClient,
  attemptId: string,
): Promise<AttemptQuestionRow[]> {
  const { data } = await db
    .from("attempt_questions")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getOptionsForQuestion(
  db: DbClient,
  questionId: string,
): Promise<OptionRow[]> {
  const { data } = await db
    .from("options")
    .select("*")
    .eq("question_id", questionId);
  return data ?? [];
}

export async function getQuestionExplanation(
  db: DbClient,
  questionId: string,
): Promise<string | null> {
  const { data } = await db
    .from("questions")
    .select("explanation")
    .eq("id", questionId)
    .maybeSingle();
  return data?.explanation ?? null;
}

export async function recordAnswer(
  db: DbClient,
  attemptQuestionId: string,
  selectedOptionId: string,
  isCorrect: boolean,
  timeSpentSeconds?: number,
): Promise<boolean> {
  const { error } = await db
    .from("attempt_questions")
    .update({
      user_selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds ?? null,
    })
    .eq("id", attemptQuestionId);
  return !error;
}

export async function completeAttempt(
  db: DbClient,
  attemptId: string,
  total: number,
  correct: number,
): Promise<boolean> {
  const percent = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
  const { error } = await db
    .from("test_attempts")
    .update({
      status: "COMPLETED",
      ended_at: new Date().toISOString(),
      score: percent,
      accuracy: percent,
    })
    .eq("id", attemptId);
  return !error;
}