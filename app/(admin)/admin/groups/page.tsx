import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminGroupsPage() {
  await requireAdmin();
  const db = await createClient();
  const { data: groups } = await db
    .from("question_groups")
    .select("id, group_type, content, created_at");

  const usageMap = new Map<string, number>();
  const { data: usage } = await db.from("questions").select("group_id");
  (usage ?? []).forEach((q) => {
    if (q.group_id) usageMap.set(q.group_id, (usageMap.get(q.group_id) ?? 0) + 1);
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question groups</h1>
          <p className="mt-1 text-sm text-muted">
            Shared passages, tables, charts and caselets that questions can reference.
          </p>
        </div>
        <Button>
          <Link href="/admin/groups/new">New group</Link>
        </Button>
      </div>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <section className="mt-6 space-y-3">
        {(groups ?? []).map((g) => (
          <Card key={g.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{g.group_type}</Badge>
                  <Badge tone="neutral">{usageMap.get(g.id) ?? 0} question(s)</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted">{g.content}</p>
              </div>
              <Link href={`/admin/groups/${g.id}`} className="font-medium text-primary-strong">
                Edit
              </Link>
            </div>
          </Card>
        ))}
        {(groups ?? []).length === 0 && (
          <Card>
            <CardHeader title="No groups yet" />
            <p className="text-sm text-muted">Create a group for a shared DI table or reading passage.</p>
          </Card>
        )}
      </section>
    </>
  );
}