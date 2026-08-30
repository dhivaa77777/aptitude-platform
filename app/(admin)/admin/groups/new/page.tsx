import { Card, CardHeader } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { GroupForm } from "@/components/admin/group-form";
import { requireAdmin } from "@/lib/admin";

export default async function NewGroupPage() {
  await requireAdmin();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New group</h1>
        <p className="mt-1 text-sm text-muted">Create a shared passage, table or chart.</p>
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
            <GroupForm />
          </div>
        </Card>
      </section>
    </>
  );
}