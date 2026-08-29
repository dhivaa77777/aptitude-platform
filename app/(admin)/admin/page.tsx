import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { Role } from "@/lib/types";

const stats = [
  { label: "Total users", value: "1,284" },
  { label: "Active questions", value: "3,912" },
  { label: "Attempts today", value: "317" },
  { label: "Avg accuracy", value: "64%" },
];

const users: {
  name: string;
  username: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
}[] = [
  { name: "Dhivaakaran B", username: "dhivaa77777", role: "LEARNER", status: "ACTIVE" },
  { name: "Priya S", username: "priya_s", role: "LEARNER", status: "ACTIVE" },
  { name: "Rahul M", username: "rahul_m", role: "LEARNER", status: "SUSPENDED" },
];

export default function MasterAdminPage() {
  return (
    <AppShell role="MASTER_ADMIN">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master admin</h1>
          <p className="mt-1 text-sm text-muted">
            Platform analytics, user management and audit log.
          </p>
        </div>
        <Badge tone="primary">MFA enabled</Badge>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <div className="text-3xl font-semibold">{s.value}</div>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <Card padded={false}>
          <div className="flex items-center justify-between p-5">
            <CardHeader title="Users" subtitle="Manage accounts and status." />
            <Button variant="secondary" size="sm">
              Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.username}>
                    <td className="px-5 py-3 font-medium text-foreground">{u.name}</td>
                    <td className="px-5 py-3 text-muted">{u.username}</td>
                    <td className="px-5 py-3">
                      <Badge tone={u.role === "MASTER_ADMIN" ? "danger" : "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.status === "ACTIVE" ? "success" : "warning"}>{u.status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Link href="#" className="text-sm font-medium text-primary-strong">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader
            title="Audit log"
            subtitle="Every sensitive admin action is recorded."
          />
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center justify-between py-3">
              <span className="text-muted">master-admin@platform.dev disabled user rahul_m</span>
              <span className="font-mono text-xs text-muted">14:02:11</span>
            </li>
            <li className="flex items-center justify-between py-3">
              <span className="text-muted">admin@platform.dev bulk-imported 214 questions</span>
              <span className="font-mono text-xs text-muted">13:47:05</span>
            </li>
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}