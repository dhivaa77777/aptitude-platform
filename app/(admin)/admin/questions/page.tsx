import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const questions = [
  { id: "Q-0392", type: "MCQ", difficulty: 3, status: "ACTIVE" as const, tags: ["QA", "Numbers", "HCF/LCM"] },
  { id: "Q-0393", type: "MCQ", difficulty: 4, status: "REVIEW_REQUIRED" as const, tags: ["LR", "Coding"] },
  { id: "Q-0394", type: "MULTI", difficulty: 5, status: "ACTIVE" as const, tags: ["DI", "Chart"] },
  { id: "Q-0395", type: "MCQ", difficulty: 2, status: "DISABLED" as const, tags: ["QA", "Percentages"] },
];

export default function AdminQuestionsPage() {
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
          <Button variant="secondary">Add question</Button>
          <Button>Bulk import</Button>
        </div>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-64">
            <Input placeholder="Search questions…" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">QA</Badge>
            <Badge tone="neutral">LR</Badge>
            <Badge tone="neutral">DI</Badge>
            <Badge tone="neutral">Verbal</Badge>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="All questions" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Difficulty</th>
                  <th className="px-5 py-3 font-medium">Tags</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{q.id}</td>
                    <td className="px-5 py-3 text-foreground">{q.type}</td>
                    <td className="px-5 py-3">
                      <Badge tone={q.difficulty > 4 ? "danger" : q.difficulty > 2 ? "warning" : "neutral"}>
                        L{q.difficulty}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {q.tags.map((t) => (
                          <Badge key={t} tone="neutral">{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={q.status === "ACTIVE" ? "success" : q.status === "REVIEW_REQUIRED" ? "warning" : "danger"}>
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <a href="#" className="font-medium text-primary-strong">
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}