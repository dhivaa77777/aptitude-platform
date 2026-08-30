import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import {
  QuestionForm,
  type FormQuestion,
  type GroupOption,
} from "@/components/admin/question-form";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const db = await createClient();
  const { id } = await params;

  const { data: question } = await db
    .from("questions")
    .select(
      "id, question_text, question_type, explanation, assigned_difficulty, estimated_time_seconds, shuffle_options, group_id, status, options(id, option_text, is_correct, display_order), question_tags(id, tag_type, tag_value)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!question) notFound();

  const { data: groups } = await db.from("question_groups").select("id, group_type, content");

  const initial: FormQuestion = {
    id: question.id,
    question_text: question.question_text,
    question_type: question.question_type,
    explanation: question.explanation ?? "",
    assigned_difficulty: question.assigned_difficulty,
    estimated_time_seconds: question.estimated_time_seconds,
    shuffle_options: question.shuffle_options,
    group_id: question.group_id,
    status: question.status,
    options: (question.options ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })),
    tags: (question.question_tags ?? []).map((t) => ({
      tag_type: t.tag_type,
      tag_value: t.tag_value,
    })),
  };

  const groupOptions: GroupOption[] =
    groups?.map((g) => ({ id: g.id, group_type: g.group_type, content: g.content })) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit question</h1>
          <p className="mt-1 font-mono text-xs text-muted">{id}</p>
        </div>
      </div>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <section className="mt-6">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Question details" />
          </div>
          <div className="px-5 pb-5">
            <QuestionForm questionId={id} initial={initial} groups={groupOptions} />
          </div>
        </Card>
      </section>
    </>
  );
}