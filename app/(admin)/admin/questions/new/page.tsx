import { Card, CardHeader } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { QuestionForm, type GroupOption } from "@/components/admin/question-form";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function NewQuestionPage() {
  await requireAdmin();
  const db = await createClient();
  const { data: groups } = await db
    .from("question_groups")
    .select("id, group_type, content");

  const groupOptions: GroupOption[] =
    groups?.map((g) => ({ id: g.id, group_type: g.group_type, content: g.content })) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New question</h1>
          <p className="mt-1 text-sm text-muted">Add a single question to the bank.</p>
        </div>
      </div>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <section className="mt-6">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Question details" subtitle="Required: question text, at least one correct option and one tag." />
          </div>
          <div className="px-5 pb-5">
            <QuestionForm groups={groupOptions} />
          </div>
        </Card>
      </section>
    </>
  );
}