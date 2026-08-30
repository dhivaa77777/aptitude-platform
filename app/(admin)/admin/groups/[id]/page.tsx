import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { GroupForm } from "@/components/admin/group-form";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { GroupType } from "@/lib/questions/types";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const db = await createClient();
  const { id } = await params;

  const { data: group } = await db
    .from("question_groups")
    .select("id, group_type, content")
    .eq("id", id)
    .maybeSingle();

  if (!group) notFound();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit group</h1>
        <p className="mt-1 font-mono text-xs text-muted">{id}</p>
      </div>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <section className="mt-6">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Group details" />
          </div>
          <div className="px-5 pb-5">
            <GroupForm
              groupId={id}
              initial={{ group_type: group.group_type as GroupType, content: group.content }}
            />
          </div>
        </Card>
      </section>
    </>
  );
}