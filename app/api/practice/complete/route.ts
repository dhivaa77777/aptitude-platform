import { NextResponse } from "next/server";
import { requireLearnerRoute } from "@/lib/learner";
import { createClient } from "@/lib/supabase/server";
import { completeAttempt, getAttemptQuestions, getOwnAttempt } from "@/lib/practice/repo";

export async function POST(request: Request) {
  const profile = await requireLearnerRoute();
  if (profile instanceof NextResponse) return profile;
  const db = await createClient();

  let body: { attemptId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.attemptId !== "string") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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
  if (rows.length === 0) {
    return NextResponse.json({ error: "Attempt has no questions." }, { status: 400 });
  }
  const unanswered = rows.filter((r) => r.user_selected_option_id === null);
  if (unanswered.length > 0) {
    return NextResponse.json(
      { error: "Answer every question before finishing." },
      { status: 400 },
    );
  }

  const correct = rows.filter((r) => r.is_correct === true).length;
  const total = rows.length;
  const percent = Math.round((correct / total) * 10000) / 100;

  const done = await completeAttempt(db, attempt.id, total, correct);
  if (!done) {
    return NextResponse.json({ error: "Failed to finish attempt." }, { status: 500 });
  }

  return NextResponse.json({ total, correct, score: percent, accuracy: percent });
}