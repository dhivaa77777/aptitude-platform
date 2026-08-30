import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type QuestionStatus,
} from "@/lib/questions/types";

interface SearchParams {
  q?: string;
  difficulty?: string;
  status?: string;
  type?: string;
  field?: string;
  topic?: string;
}

function toneFor(status: QuestionStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "REVIEW_REQUIRED") return "warning" as const;
  return "danger" as const;
}

function difficultyTone(d: number) {
  if (d > 4) return "danger" as const;
  if (d > 2) return "warning" as const;
  return "neutral" as const;
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const db = await createClient();
  const sp = await searchParams;

  const { data: questions } = await db
    .from("questions")
    .select("id, question_text, question_type, assigned_difficulty, status, question_tags(tag_type, tag_value)");

  const rows = (questions ?? [])
    .filter((q) => !sp.q || q.question_text.toLowerCase().includes(sp.q.toLowerCase()))
    .filter((q) => !sp.difficulty || String(q.assigned_difficulty) === sp.difficulty)
    .filter((q) => !sp.type || q.question_type === sp.type)
    .filter((q) => !sp.status || q.status === sp.status)
    .filter((q) => !sp.field || (q.question_tags ?? []).some((t) => t.tag_type === "FIELD" && t.tag_value.toLowerCase() === sp.field!.toLowerCase()))
    .filter((q) => !sp.topic || (q.question_tags ?? []).some((t) => t.tag_type === "TOPIC" && t.tag_value.toLowerCase() === sp.topic!.toLowerCase()))
    .sort((a, b) => a.assigned_difficulty - b.assigned_difficulty);

  const fields = new Set<string>();
  (questions ?? []).forEach((q) => {
    (q.question_tags ?? []).forEach((t) => {
      if (t.tag_type === "FIELD") fields.add(t.tag_value);
    });
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question bank</h1>
          <p className="mt-1 text-sm text-muted">
            Add, edit, disable and bulk-import questions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Link href="/admin/questions/new">Add question</Link>
          </Button>
          <Button>
            <Link href="/admin/questions/import">Bulk import</Link>
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <Card className="mt-6">
        <form method="GET" action="/admin/questions" className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-64">
            <label className="mb-1 block text-sm font-medium">Search</label>
            <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search questions…" />
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1 block text-sm font-medium">Type</label>
            <Select name="type" defaultValue={sp.type ?? ""}>
              <option value="">All</option>
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1 block text-sm font-medium">Difficulty</label>
            <Select name="difficulty" defaultValue={sp.difficulty ?? ""}>
              <option value="">All</option>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Level {d}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-sm font-medium">Status</label>
            <Select name="status" defaultValue={sp.status ?? ""}>
              <option value="">All</option>
              {QUESTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <label className="mb-1 block text-sm font-medium">Field</label>
            <Select name="field" defaultValue={sp.field ?? ""}>
              <option value="">All</option>
              {[...fields].sort().map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <Button type="submit" variant="secondary">Apply</Button>
          <Link href="/admin/questions" className="text-sm text-muted hover:text-foreground">
            Reset
          </Link>
        </form>
      </Card>

      <section className="mt-4">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title={`All questions (${rows.length})`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Difficulty</th>
                  <th className="px-5 py-3 font-medium">Tags</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((q) => (
                  <tr key={q.id}>
                    <td className="max-w-md px-5 py-3 text-foreground">
                      <span className="line-clamp-2">{q.question_text}</span>
                    </td>
                    <td className="px-5 py-3 text-foreground">{q.question_type}</td>
                    <td className="px-5 py-3">
                      <Badge tone={difficultyTone(q.assigned_difficulty)}>L{q.assigned_difficulty}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {(q.question_tags ?? []).map((t) => (
                          <Badge key={`${t.tag_type}-${t.tag_value}`} tone="neutral">{t.tag_value}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={toneFor(q.status)}>{q.status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/questions/${q.id}`} className="font-medium text-primary-strong">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="p-5 text-sm text-muted">No questions match.</div>
            )}
          </div>
        </Card>
      </section>
    </>
  );
}