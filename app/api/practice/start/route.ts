import { NextResponse } from "next/server";
import { requireLearnerRoute } from "@/lib/learner";
import { createClient } from "@/lib/supabase/server";
import {
  createPracticeAttempt,
  insertAttemptQuestion,
  loadActiveMcqQuestions,
  loadHistory,
  matchesFilters,
  touchQuestionHistory,
} from "@/lib/practice/repo";
import {
  optionSeed,
  selectQuestionIds,
  seededShuffle,
  type Candidate,
} from "@/lib/practice/selection";
import {
  DEFAULT_CUTOFF_DAYS,
  DEFAULT_PRACTICE_COUNT,
  MAX_PRACTICE_COUNT,
  type PracticeFilters,
  type PracticeQuestionPayload,
} from "@/lib/practice/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function parseStartBody(body: unknown): PracticeFilters | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const field = typeof b.field === "string" && b.field.trim() ? b.field.trim() : null;
  const topic = typeof b.topic === "string" && b.topic.trim() ? b.topic.trim() : null;
  let difficulty: number | null = null;
  if (b.difficulty !== null && b.difficulty !== undefined && b.difficulty !== "") {
    const d = Number(b.difficulty);
    if (!Number.isInteger(d) || d < 1 || d > 5) return null;
    difficulty = d;
  }
  let count = DEFAULT_PRACTICE_COUNT;
  if (b.count !== null && b.count !== undefined && b.count !== "") {
    const c = Number(b.count);
    if (!Number.isInteger(c) || c < 1 || c > MAX_PRACTICE_COUNT) return null;
    count = c;
  }
  return { field, topic, difficulty, count };
}

export async function POST(request: Request) {
  const profile = await requireLearnerRoute();
  if (profile instanceof NextResponse) return profile;
  const db = await createClient();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const filters = parseStartBody(raw);
  if (!filters) {
    return NextResponse.json({ error: "Invalid practice configuration." }, { status: 400 });
  }

  const [loaded, history] = await Promise.all([
    loadActiveMcqQuestions(db),
    loadHistory(db, profile.id),
  ]);

  const matches = loaded.filter((item) => matchesFilters(item, filters));
  const candidates: Candidate[] = matches.map((item) => {
    const h = history.get(item.question.id);
    return {
      id: item.question.id,
      timesSeen: h?.times_seen ?? 0,
      lastSeenAt: h?.last_seen_at ?? null,
    };
  });

  const chosen = selectQuestionIds(candidates, {
    requested: filters.count,
    cutoffDays: DEFAULT_CUTOFF_DAYS,
  });
  if (chosen.length === 0) {
    return NextResponse.json(
      { error: "No questions match your selection. Try broader filters." },
      { status: 404 },
    );
  }

  const chosenSet = new Set(chosen);
  const attemptId = await createPracticeAttempt(db, profile.id, filters, chosen.length);
  if (!attemptId) {
    return NextResponse.json({ error: "Failed to start practice." }, { status: 500 });
  }

  const questions: PracticeQuestionPayload[] = [];
  for (let i = 0; i < chosen.length; i += 1) {
    const item = matches.find((m) => m.question.id === chosen[i]);
    if (!item || !chosenSet.has(item.question.id)) continue;
    const q = item.question;
    const baseOptions = [...q.options].sort((a, b) => a.display_order - b.display_order);
    const correctOption = baseOptions.find((o) => o.is_correct);
    if (!correctOption) continue;

    const seed = optionSeed(attemptId, q.id);
    const displayIdOrder =
      q.shuffle_options === false
        ? baseOptions.map((o) => o.id)
        : seededShuffle(
            baseOptions.map((o) => o.id),
            seed,
          );
    const orderedOptions = displayIdOrder
      .map((id, pos) => {
        const opt = baseOptions.find((o) => o.id === id);
        return opt ? { id: opt.id, text: opt.option_text, label: LETTERS[pos] ?? "?" } : null;
      })
      .filter((o): o is PracticeQuestionPayload["options"][number] => o !== null);

    const attemptQuestionId = await insertAttemptQuestion(db, {
      attemptId,
      questionId: q.id,
      displayOrder: i + 1,
      optionOrderSeed: seed,
      correctOptionId: correctOption.id,
    });
    if (!attemptQuestionId) continue;

    const historyRow = history.get(q.id);
    await touchQuestionHistory(db, profile.id, q.id, (historyRow?.times_seen ?? 0) + 1);

    questions.push({
      index: i + 1,
      attemptQuestionId,
      questionId: q.id,
      questionText: q.question_text,
      options: orderedOptions,
    });
  }

  return NextResponse.json({
    attemptId,
    total: questions.length,
    questions,
  });
}