import { parseCsv } from "./csv";
import { normalizeText } from "./duplicates";
import {
  IMPORT_CSV_HEADERS,
  IMPORT_MAX_ROWS,
  MAX_OPTIONS,
  type QuestionInput,
  type QuestionTagInput,
} from "./types";
import { validateQuestion } from "./validation";

export interface ImportRow {
  rowIndex: number;
  errors: string[];
  duplicate:
    | { kind: "existing" | "in_batch" }
    | null;
  parsed: QuestionInput | null;
}

export interface ImportResult {
  rows: ImportRow[];
  totalRows: number;
  rowLimit: number;
  limitExceeded: boolean;
  skippedHeader: boolean;
}

function parseBool(value: string, errors: string[], label: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "" || v === "false" || v === "0" || v === "no") return false;
  errors.push(`${label} must be true or false.`);
  return false;
}

export function parseImportCsv(
  text: string,
  existingNormalized: ReadonlySet<string>,
): ImportResult {
  const raw = parseCsv(text).filter(
    (row) => !row.every((cell) => cell.trim() === ""),
  );

  let start = 0;
  let skippedHeader = false;
  if (raw.length > 0) {
    const first = raw[0].map((c) => c.trim().toLowerCase());
    if (first.includes("question_text")) {
      start = 1;
      skippedHeader = true;
    }
  }

  const rows: ImportRow[] = [];
  const batchNormalized = new Set<string>();

  for (let i = start; i < raw.length; i++) {
    const row = raw[i];
    const cells: Record<string, string> = {};
    IMPORT_CSV_HEADERS.forEach((h, idx) => {
      cells[h] = (row[idx] ?? "").trim();
    });

    const errors: string[] = [];
    if (rows.length >= IMPORT_MAX_ROWS) {
      rows.push({
        rowIndex: i + 1,
        errors: ["Row limit exceeded."],
        duplicate: null,
        parsed: null,
      });
      continue;
    }

    const questionText = cells.question_text;

    const options: QuestionInput["options"] = [];
    for (let o = 1; o <= MAX_OPTIONS; o++) {
      const text = cells[`option_${o}`];
      if (text) {
        options.push({
          option_text: text,
          is_correct: parseBool(cells[`correct_${o}`], errors, `correct_${o}`),
          display_order: o,
        });
      }
    }

    const tags: QuestionTagInput[] = [];
    (["field", "category", "topic", "subtopic"] as const).forEach((key) => {
      if (cells[key]) {
        tags.push({
          tag_type: key.toUpperCase() as QuestionTagInput["tag_type"],
          tag_value: cells[key],
        });
      }
    });

    let type: QuestionInput["question_type"] = "MCQ";
    const typeRaw = cells.type.trim().toUpperCase();
    if (typeRaw === "MULTI" || typeRaw === "MULTIPLE") {
      type = "MULTI";
    } else if (typeRaw && typeRaw !== "MCQ" && typeRaw !== "SINGLE") {
      errors.push("type must be MCQ or MULTI.");
    }

    let difficulty = Number(cells.difficulty);
    if (cells.difficulty === "") {
      errors.push("difficulty is required.");
    } else if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      errors.push("difficulty must be an integer between 1 and 5.");
      difficulty = NaN;
    }

    let timeSeconds = Number(cells.time_seconds);
    if (cells.time_seconds === "") {
      errors.push("time_seconds is required.");
    } else if (
      !Number.isInteger(timeSeconds) ||
      timeSeconds < 5 ||
      timeSeconds > 3600
    ) {
      errors.push("time_seconds must be an integer between 5 and 3600.");
      timeSeconds = NaN;
    }

    const shuffleErrors: string[] = [];
    const shuffle = parseBool(cells.shuffle, shuffleErrors, "shuffle");
    errors.push(...shuffleErrors);

    const parsed: QuestionInput = {
      question_text: questionText,
      question_type: type,
      explanation: cells.explanation,
      assigned_difficulty: difficulty,
      estimated_time_seconds: timeSeconds,
      shuffle_options: shuffle,
      group_id: null,
      status: "REVIEW_REQUIRED",
      options,
      tags,
    };

    errors.push(...validateQuestion(parsed));

    if (errors.length === 0) {
      const key = normalizeText(questionText);
      if (existingNormalized.has(key)) {
        rows.push({
          rowIndex: i + 1,
          errors: [],
          duplicate: { kind: "existing" },
          parsed,
        });
        continue;
      }
      if (batchNormalized.has(key)) {
        rows.push({
          rowIndex: i + 1,
          errors: [],
          duplicate: { kind: "in_batch" },
          parsed,
        });
        continue;
      }
      batchNormalized.add(key);
    }

    rows.push({
      rowIndex: i + 1,
      errors,
      duplicate: null,
      parsed: errors.length === 0 ? parsed : null,
    });
  }

  return {
    rows,
    totalRows: raw.length - start,
    rowLimit: IMPORT_MAX_ROWS,
    limitExceeded: raw.length - start > IMPORT_MAX_ROWS,
    skippedHeader,
  };
}