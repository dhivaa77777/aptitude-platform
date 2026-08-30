import { NextResponse } from "next/server";
import { auditLog, requireAdminRoute } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getExistingNormalizedTexts, createQuestion } from "@/lib/questions/repo";
import { parseImportCsv, type ImportRow } from "@/lib/questions/import";

const WINDOW_MS = 300_000;
const MAX_REQUESTS = 5;
const limiter = new Map<string, { count: number; resetAt: number }>();

function rateLimited(profileId: string): boolean {
  const now = Date.now();
  const entry = limiter.get(profileId);
  if (!entry || now > entry.resetAt) {
    limiter.set(profileId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

function previewRow(row: ImportRow) {
  return {
    rowIndex: row.rowIndex,
    errors: row.errors,
    duplicate: row.duplicate,
    question_text: row.parsed?.question_text ?? null,
    question_type: row.parsed?.question_type ?? null,
    difficulty: row.parsed?.assigned_difficulty ?? null,
    option_count: row.parsed?.options.length ?? 0,
    tags: row.parsed?.tags.map((t) => t.tag_value) ?? [],
  };
}

export async function POST(request: Request) {
  const profile = await requireAdminRoute();
  if (profile instanceof NextResponse) return profile;
  const db = await createClient();

  if (rateLimited(profile.id)) {
    return NextResponse.json(
      { error: "Import rate limit reached. Try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: { csv?: string; commit?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
  }
  const commit = body.commit === true;

  const existing = await getExistingNormalizedTexts(db);
  const result = parseImportCsv(csv, existing);

  if (!commit) {
    return NextResponse.json({
      totalRows: result.totalRows,
      skippedHeader: result.skippedHeader,
      limitExceeded: result.limitExceeded,
      rows: result.rows.map(previewRow),
    });
  }

  const valid = result.rows.filter((r) => r.parsed && !r.duplicate && r.errors.length === 0);
  if (valid.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: result.rows.length });
  }

  let inserted = 0;
  const failures: { rowIndex: number; error: string }[] = [];
  for (const row of valid) {
    const { id, error } = await createQuestion(db, row.parsed!);
    if (error || !id) {
      failures.push({ rowIndex: row.rowIndex, error: error?.message ?? "Insert failed." });
      continue;
    }
    inserted += 1;
    await auditLog(db, "IMPORT_QUESTION", "question", id);
  }

  return NextResponse.json({
    inserted,
    skipped: result.rows.length - valid.length,
    failures,
  });
}