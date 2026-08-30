"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { IMPORT_CSV_HEADERS } from "@/lib/questions/types";

interface PreviewRow {
  rowIndex: number;
  errors: string[];
  duplicate: { kind: "existing" | "in_batch" } | null;
  question_text: string | null;
  question_type: string | null;
  difficulty: number | null;
  option_count: number;
  tags: string[];
}

interface PreviewResult {
  totalRows: number;
  skippedHeader: boolean;
  limitExceeded: boolean;
  rowLimit: number;
  rows: PreviewRow[];
}

const SAMPLE_CSV = [
  "field,category,topic,subtopic,type,difficulty,time_seconds,shuffle,question_text,explanation,option_1,option_2,option_3,option_4,option_5,option_6,correct_1,correct_2,correct_3,correct_4,correct_5,correct_6",
  "QA,Numbers,HCF/LCM,,MCQ,3,60,true,\"What is the HCF of 12 and 18?\",,6,12,18,36,,,,true,false,false,false,,",
  "LR,Coding,,,MULTI,4,90,true,\"Which of these are prime?\",,2,4,7,9,,,,true,false,true,false,,",
].join("\n");

export function ImportWizard() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  async function runPreview() {
    setError(null);
    setPreview(null);
    setResult(null);
    setBusy(true);
    const res = await fetch("/api/admin/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, commit: false }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Preview failed.");
      return;
    }
    setPreview(data as PreviewResult);
  }

  async function commit() {
    if (!preview) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, commit: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed.");
      return;
    }
    setResult({ inserted: data.inserted, skipped: data.skipped });
    setPreview(null);
  }

  const validCount = preview?.rows.filter((r) => r.errors.length === 0 && !r.duplicate).length ?? 0;
  const duplicateCount = preview?.rows.filter((r) => r.duplicate).length ?? 0;
  const errorCount = preview ? preview.rows.length - validCount - duplicateCount : 0;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-2 text-lg font-semibold">1. Paste CSV</h3>
        <p className="mb-3 text-sm text-muted">
          Columns: {IMPORT_CSV_HEADERS.join(", ")}. Imported questions are saved as{" "}
          <Badge tone="warning">REVIEW_REQUIRED</Badge>.
        </p>
        <Textarea
          rows={8}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Paste or drop your CSV here…"
        />
        <div className="mt-2">
          <Button type="button" onClick={runPreview} disabled={busy || !csv.trim()}>
            Preview
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted">Sample format</h3>
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-muted">{SAMPLE_CSV}</pre>
      </div>

      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {preview && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {preview.totalRows} rows ·{" "}
              <span className="text-success">{validCount} valid</span> ·{" "}
              <span className="text-warning">{duplicateCount} duplicate</span> ·{" "}
              <span className="text-danger">{errorCount} with errors</span>
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={runPreview} disabled={busy}>
                Re-preview
              </Button>
              <Button onClick={commit} disabled={busy || validCount === 0}>
                Import {validCount > 0 ? `(${validCount})` : ""}
              </Button>
            </div>
          </div>

          {preview.limitExceeded && (
            <div className="mb-3 rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
              More than {preview.rowLimit} rows were provided; only the first {preview.rowLimit} were parsed.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">Options</th>
                  <th className="px-3 py-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.map((r) => (
                  <tr key={r.rowIndex}>
                    <td className="px-3 py-2 font-mono text-xs text-muted">{r.rowIndex}</td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0 ? (
                        <Badge tone="danger">{r.errors.length} errors</Badge>
                      ) : r.duplicate ? (
                        <Badge tone="warning">Duplicate ({r.duplicate.kind})</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </td>
                    <td className="max-w-xs px-3 py-2">
                      <span className="line-clamp-2">{r.question_text ?? "—"}</span>
                      {r.errors.length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-xs text-danger">
                          {r.errors.slice(0, 4).map((e) => <li key={e}>{e}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.question_type ?? "—"}</td>
                    <td className="px-3 py-2">{r.difficulty ?? "—"}</td>
                    <td className="px-3 py-2">{r.option_count}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <Card>
          <div className="mb-2 text-lg font-semibold">Import complete</div>
          <p className="text-sm text-muted">
            Inserted <span className="font-medium text-success">{result.inserted}</span> questions, skipped{" "}
            {result.skipped} (duplicates or invalid).
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => router.push("/admin/questions")}>View question bank</Button>
            <Button variant="secondary" onClick={() => { setResult(null); setCsv(""); }}>
              Import another file
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}