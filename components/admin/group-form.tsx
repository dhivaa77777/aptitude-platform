"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GROUP_TYPES, type GroupType } from "@/lib/questions/types";

interface GroupFormProps {
  groupId?: string;
  initial?: { group_type: GroupType; content: string };
}

export function GroupForm({ groupId, initial }: GroupFormProps) {
  const router = useRouter();
  const isEdit = Boolean(groupId);
  const [groupType, setGroupType] = useState<GroupType>(initial?.group_type ?? "DI_TABLE");
  const [content, setContent] = useState(initial?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(
      isEdit ? `/api/admin/question-groups/${groupId}` : "/api/admin/question-groups",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_type: groupType, content }),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }
    router.push("/admin/groups");
    router.refresh();
  }

  async function remove() {
    if (!isEdit || !window.confirm("Delete this group? Groups used by questions cannot be deleted.")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/question-groups/${groupId}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }
    router.push("/admin/groups");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Group type</label>
        <Select value={groupType} onChange={(e) => setGroupType(e.target.value as GroupType)}>
          {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Content</label>
        <Textarea
          required
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Passage text, table data or chart description…"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create group"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/groups")}>
          Cancel
        </Button>
        {isEdit && (
          <Button type="button" variant="danger" disabled={deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}