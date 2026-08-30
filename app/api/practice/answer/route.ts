import { NextResponse } from "next/server";
import { requireLearnerRoute } from "@/lib/learner";
import { createClient } from "@/lib/supabase/server";
import {
  getAttemptQuestions,
  getOptionsForQuestion,
  getOwnAttempt,
  getQuestionExplanation,
  recordAnswer,
} from "@/lib/practice/repo";
import type { PracticeAnswerRequest } from "@/lib/practice/types";

export async function POST(request: Request) {
  const profile = await requireLearnerRoute();
  if (profile instanceof NextResponse) return profile;
  const db = await createClient();

  let body: PracticeAnswerRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (
    typeof body.attemptId !== "string" ||
    typeof body.attemptQuestionId !== "string" ||
    typeof body.selectedOptionId !== "string"
  ) {
    return NextResponse.json({ error: "Invalid answer payload." }, { status: 400 });
  }

  const attempt = await getOwnAttempt(db, profile.id, body.attemptId);
  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 403 });
  }
  if (attempt.mode !== "PRACTICE") {
    return NextResponse.json({ error: "Not a practice attempt." }, { status: 400 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt is already finished." }, { status: 400 });
  }

  const rows = await getAttemptQuestions(db, attempt.id);
  const target = rows.find((r) => r.id === body.attemptQuestionId);
  if (!target) {
    return NextResponse.json({ error: "Question not in this attempt." }, { status: 400 });
  }

  const currentOrder = rows.find((r) => r.user_selected_option_id === null)?.display_order ?? null;
  if (currentOrder !== null && target.display_order > currentOrder) {
    return NextResponse.json(
      { error: "Navigation out of order. Answer the current question first." },
      { status: 409 },
    );
  }

  const optionIds = await getOptionsForQuestion(db, target.question_id);
  if (!optionIds.some((o) => o.id === body.selectedOptionId)) {
    return NextResponse.json(
      { error: "Selected option does not belong to this question." },
      { status: 400 },
    );
  }

  const isCorrect = body.selectedOptionId === target.correct_option_id_snapshot;
  let timeSpent: number | null = null;
  if (
    body.timeSpentSeconds !== undefined &&
    Number.isInteger(body.timeSpentSeconds) &&
    body.timeSpentSeconds >= 0
  ) {
    timeSpent = body.timeSpentSeconds;
  }

  const recorded = await recordAnswer(
    db,
    target.id,
    body.selectedOptionId,
    isCorrect,
    timeSpent ?? undefined,
  );
  if (!recorded) {
    return NextResponse.json({ error: "Failed to record answer." }, { status: 500 });
  }

  const explanation = await getQuestionExplanation(db, target.question_id);
  return NextResponse.json({
    correct: isCorrect,
    correctOptionId: target.correct_option_id_snapshot,
    explanation,
  });
}