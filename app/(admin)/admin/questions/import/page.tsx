import { Card, CardHeader } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ImportWizard } from "@/components/admin/import-wizard";
import { requireAdmin } from "@/lib/admin";

export default async function ImportQuestionsPage() {
  await requireAdmin();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk import</h1>
        <p className="mt-1 text-sm text-muted">
          Validate and insert many questions at once. Nothing is written until you confirm.
        </p>
      </div>

      <div className="mt-4">
        <AdminTabs />
      </div>

      <section className="mt-6">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Import" />
          </div>
          <div className="px-5 pb-5">
            <ImportWizard />
          </div>
        </Card>
      </section>
    </>
  );
}