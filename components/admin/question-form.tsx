"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  TAG_TYPES,
  type QuestionStatus,
  type QuestionType,
  type TagType,
} from "@/lib/questions/types";

export interface FormQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  explanation: string | null;
  assigned_difficulty: number;
  estimated_time_seconds: number | null;
  shuffle_options: boolean;
  group_id: string | null;
  status: QuestionStatus;
  options: { option_text: string; is_correct: boolean }[];
  tags: { tag_type: TagType; tag_value: string }[];
}

export interface GroupOption {
  id: string;
  group_type: string;
  content: string;
}

interface QuestionFormProps {
  questionId?: string;
  initial?: FormQuestion;
  groups: GroupOption[];
}

interface OptionRow {
  option_text: string;
  is_correct: boolean;
}

const defaultOptions: OptionRow[] = [
  { option_text: "", is_correct: true },
  { option_text: "", is_correct: false },
];

const emptyTags = () =>
  Object.fromEntries(TAG_TYPES.map((t) => [t, ""])) as Record<TagType, string>;

export function QuestionForm({ questionId, initial, groups }: QuestionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(questionId);

  const [questionText, setQuestionText] = useState(initial?.question_text ?? "");
  const [questionType, setQuestionType] = useState<QuestionType>(
    initial?.question_type ?? "MCQ",
  );
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [difficulty, setDifficulty] = useState(String(initial?.assigned_difficulty ?? 3));
  const [timeSeconds, setTimeSeconds] = useState(
    String(initial?.estimated_time_seconds ?? 45),
  );
  const [shuffle, setShuffle] = useState(initial?.shuffle_options ?? true);
  const [status, setStatus] = useState<QuestionStatus>(
    initial?.status ?? "REVIEW_REQUIRED",
  );
  const [groupId, setGroupId] = useState(initial?.group_id ?? "");
  const [options, setOptions] = useState<OptionRow[]>(
    initial?.options.length ? initial.options : defaultOptions,
  );
  const [tags, setTags] = useState<Record<TagType, string>>(() => {
    const t = emptyTags();
    initial?.tags.forEach((tag) => {
      t[tag.tag_type] = tag.tag_value;
    });
    return t;
  });

  const [duplicate, setDuplicate] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!isEdit && questionText.trim().length < 15) {
        setDuplicate(false);
        setDuplicateChecked(false);
        return;
      }
      fetch("/api/admin/questions/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: questionText,
          exclude_id: questionId ?? null,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setDuplicate(Boolean(data.duplicate));
          setDuplicateChecked(true);
        })
        .catch(() => {
          setDuplicateChecked(false);
        });
    }, 500);
    return () => clearTimeout(handle);
  }, [questionText, questionId, isEdit]);

  function updateOption(index: number, patch: Partial<OptionRow>) {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    );
  }

  function toggleCorrect(index: number) {
    setOptions((prev) =>
      prev.map((o, i) =>
        i === index
          ? { ...o, is_correct: !o.is_correct }
          : questionType === "MCQ"
            ? { ...o, is_correct: false }
            : o,
      ),
    );
  }

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { option_text: "", is_correct: false },
    ]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setDetails([]);

    const payload = {
      question_text: questionText,
      question_type: questionType,
      explanation,
      assigned_difficulty: Number(difficulty),
      estimated_time_seconds: Number(timeSeconds),
      shuffle_options: shuffle,
      group_id: groupId || null,
      status,
      options: options.map((o, index) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        display_order: index + 1,
      })),
      tags: TAG_TYPES.filter((t) => tags[t].trim()).map((t) => ({
        tag_type: t,
        tag_value: tags[t].trim(),
      })),
    };

    const res = await fetch(
      isEdit ? `/api/admin/questions/${questionId}` : "/api/admin/questions",
      { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      setDetails(Array.isArray(data.details) ? data.details : []);
      return;
    }
    router.push("/admin/questions");
    router.refresh();
  }

  async function remove() {
    if (!isEdit || !window.confirm("Delete this question permanently?")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }
    router.push("/admin/questions");
    router.refresh();
  }

  async function updateStatus(next: QuestionStatus) {
    if (!isEdit) return;
    const res = await fetch(`/api/admin/questions/${questionId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      setStatus(next);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Status update failed.");
    }
  }

  const correctCount = options.filter((o) => o.is_correct).length;

  return (
    <form onSubmit={submit} className="space-y-6">
      {duplicateChecked && duplicate && (
        <div className="rounded-lg border border-warning bg-warning/10 px-4 py-3 text-sm text-warning">
          A question with the same text already exists.
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Question text</label>
            <Textarea
              required
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Write the question…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)}>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)}>
                {QUESTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Difficulty (1–5)</label>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>Level {d}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Estimated time (seconds)</label>
              <Input
                type="number"
                min={5}
                max={3600}
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Shuffle option order at display time
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">Group (optional)</label>
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_type} — {g.content.slice(0, 60)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Explanation</label>
            <Textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Optional explanation shown after answering"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Options</h3>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={options.length >= MAX_OPTIONS} onClick={addOption}>
              Add option
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={options.length <= MIN_OPTIONS} onClick={() => removeOption(options.length - 1)}>
              Remove last
            </Button>
          </div>
        </div>
        <div className="mb-3 text-sm text-muted">
          {correctCount} marked correct
          {questionType === "MCQ" && correctCount > 1
            ? " — MCQ must have exactly one correct answer"
            : ""}
        </div>
        <div className="space-y-2">
          {options.map((o, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 text-right font-mono text-xs text-muted">{index + 1}.</span>
              <Input
                value={o.option_text}
                onChange={(e) => updateOption(index, { option_text: e.target.value })}
                placeholder={`Option ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => toggleCorrect(index)}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors"
                style={o.is_correct ? { borderColor: "var(--color-primary)", color: "var(--color-primary-strong)", background: "var(--color-primary-foreground)" } : undefined}
              >
                {o.is_correct ? "Correct" : "Wrong"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Tags</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {TAG_TYPES.map((t) => (
            <div key={t}>
              <label className="mb-1 block text-sm font-medium capitalize">{t.toLowerCase()}</label>
              <Input
                value={tags[t]}
                onChange={(e) => setTags((prev) => ({ ...prev, [t]: e.target.value }))}
                placeholder={`e.g. ${t === "FIELD" ? "QA" : t === "CATEGORY" ? "Numbers" : t === "TOPIC" ? "HCF/LCM" : "Dividend rules"}`}
              />
            </div>
          ))}
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
          {details.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create question"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/questions")}>
          Cancel
        </Button>
        {isEdit && status !== "DISABLED" && (
          <Button type="button" variant="secondary" onClick={() => updateStatus("DISABLED")}>
            Disable
          </Button>
        )}
        {isEdit && (
          <Button type="button" variant="danger" disabled={deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}