import { test } from "node:test";
import assert from "node:assert/strict";

import { parseCsv } from "../lib/questions/csv";
import { normalizeText, isDuplicateText } from "../lib/questions/duplicates";
import { validateQuestion } from "../lib/questions/validation";
import { parseImportCsv } from "../lib/questions/import";
import { IMPORT_MAX_ROWS, type QuestionInput } from "../lib/questions/types";

function validBase(overrides: Partial<QuestionInput> = {}): QuestionInput {
  return {
    question_text: "What is the HCF of 12 and 18?",
    question_type: "MCQ",
    explanation: "",
    assigned_difficulty: 3,
    estimated_time_seconds: 60,
    shuffle_options: true,
    group_id: null,
    status: "ACTIVE",
    options: [
      { option_text: "6", is_correct: true, display_order: 1 },
      { option_text: "12", is_correct: false, display_order: 2 },
      { option_text: "18", is_correct: false, display_order: 3 },
      { option_text: "36", is_correct: false, display_order: 4 },
    ],
    tags: [{ tag_type: "FIELD", tag_value: "QA" }],
    ...overrides,
  };
}

test("normalizeText folds case, punctuation and whitespace", () => {
  assert.equal(normalizeText("What is the HCF  of 12?!"), "what is the hcf of 12");
  assert.equal(normalizeText("What is the HCF of 12?"), normalizeText("  WHAT IS THE   HCF OF 12 ? "));
  assert.equal(normalizeText("a/b_c, d"), "a b c d");
});

test("isDuplicateText matches normalized existing text", () => {
  const existing = new Set([normalizeText("What Is 2+2?")]);
  assert.equal(isDuplicateText("What is 2+2?", existing), true);
  assert.equal(isDuplicateText("What is 3+3?", existing), false);
});

test("parseCsv handles quotes, escapes and CRLF", () => {
  const text = 'a,"b,c","d ""quoted""",e\r\nf,g,h,"multi\nline"\n';
  const rows = parseCsv(text);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["a", "b,c", 'd "quoted"', "e"]);
  assert.deepEqual(rows[1], ["f", "g", "h", "multi\nline"]);
});

test("validateQuestion accepts a well-formed question", () => {
  assert.deepEqual(validateQuestion(validBase()), []);
});

test("validateQuestion wrong paths", () => {
  assert.ok(
    validateQuestion(validBase({ question_type: "MCQ", options: [
      { ...validBase().options[0], is_correct: true },
      { option_text: "12", is_correct: true, display_order: 2 },
    ] })).some((e) => e.includes("exactly one")),
    "MCQ with two correct must error",
  );

  assert.ok(
    validateQuestion(validBase({ options: validBase().options.map((o) => ({ ...o, is_correct: false })) }))
      .some((e) => e.includes("At least one option")),
    "no correct option must error",
  );

  assert.ok(
    validateQuestion(validBase({ options: [validBase().options[0]] }))
      .some((e) => e.includes("at least 2")),
    "<2 options must error",
  );

  const seven = validBase({ options: [
    ...Array.from({ length: 7 }, (_, i) => ({
      option_text: `o${i}`, is_correct: i === 0, display_order: i + 1,
    })),
  ] });
  assert.ok(validateQuestion(seven).some((e) => e.includes("more than 6")));

  const dupOrder = validBase({
    options: validBase().options.map((o, i) => ({ ...o, display_order: i === 1 ? 1 : o.display_order })),
  });
  assert.ok(validateQuestion(dupOrder).some((e) => e.includes("display_order values must be unique")));

  assert.ok(
    validateQuestion(validBase({ tags: [] })).some((e) => e.includes("At least one tag")),
    "no tags must error",
  );

  const dupTags = validBase({ tags: [
    { tag_type: "FIELD", tag_value: "QA" },
    { tag_type: "FIELD", tag_value: "LR" },
  ] });
  assert.ok(validateQuestion(dupTags).some((e) => e.includes("Duplicate tag type")));

  assert.ok(
    validateQuestion(validBase({ assigned_difficulty: 9 })).some((e) => e.includes("between 1 and 5")),
  );
  assert.ok(
    validateQuestion(validBase({ estimated_time_seconds: 3 })).some((e) => e.includes("between 5 and 3600")),
  );
  assert.ok(
    validateQuestion(validBase({ question_text: "   " })).some((e) => e.includes("required")),
  );
});

const CSV = [
  "field,category,topic,subtopic,type,difficulty,time_seconds,shuffle,question_text,explanation,option_1,option_2,option_3,option_4,option_5,option_6,correct_1,correct_2,correct_3,correct_4,correct_5,correct_6",
  "QA,Numbers,HCF/LCM,,MCQ,3,60,true,\"What is the HCF of 18 and 12?\",,6,12,18,36,,,,true,false,false,false,,",
  "LR,Coding,,,MULTI,4,90,true,\"Which of these are prime?\",,2,4,7,9,,,,true,false,true,false,,",
].join("\n");

test("parseImportCsv parses valid rows and skips the header", () => {
  const result = parseImportCsv(CSV, new Set());
  assert.equal(result.skippedHeader, true);
  assert.equal(result.totalRows, 2);
  assert.equal(result.limitExceeded, false);
  const [r1, r2] = result.rows;
  assert.deepEqual(r1.errors, []);
  assert.equal(r1.duplicate, null);
  assert.equal(r1.parsed?.question_text, "What is the HCF of 18 and 12?");
  assert.equal(r1.parsed?.question_type, "MCQ");
  assert.equal(r1.parsed?.status, "REVIEW_REQUIRED");
  assert.equal(r1.parsed?.options.filter((o) => o.is_correct).length, 1);
  assert.deepEqual(r2.errors, []);
  assert.equal(r2.parsed?.question_type, "MULTI");
  assert.equal(r2.parsed?.options.filter((o) => o.is_correct).length, 2);
  assert.ok(r1.parsed?.tags.some((t) => t.tag_type === "TOPIC" && t.tag_value === "HCF/LCM"));
});

test("parseImportCsv flags in-batch and existing duplicates", () => {
  const line =
    "QA,Numbers,HCF/LCM,,MCQ,3,60,true,\"HCF of 12 and 18?\",,6,12,18,36,,,,true,false,false,false,,";
  const csv = [CSV.split("\n")[0], line, line].join("\n");
  const result = parseImportCsv(csv, new Set([normalizeText("What is 2+2?")]));
  assert.equal(result.rows[0].duplicate, null);
  assert.equal(result.rows[1].duplicate?.kind, "in_batch");

  const existing = parseImportCsv(line, new Set([normalizeText("Hcf Of 12 and 18?")]));
  assert.equal(existing.rows[0].duplicate?.kind, "existing");
});

test("parseImportCsv catches an MCQ with two correct answers", () => {
  const header = CSV.split("\n")[0];
  const badRow =
    ",,,,,MCQ,3,60,true,Which two are right?,,2,4,7,9,,,,true,false,true,false,,";
  const result = parseImportCsv(`${header}\n${badRow}`, new Set());
  assert.equal(result.rows[0].errors.some((e) => e.includes("exactly one")), true);
  assert.equal(result.rows[0].parsed, null);
});

test("parseImportCsv requires difficulty and time_seconds", () => {
  const header = CSV.split("\n")[0];

  const noDifficulty = "QA,N,,,MCQ,,60,true,Q?, ,1,2,3,4,,,,true,false,false,false,,";
  const r1 = parseImportCsv(`${header}\n${noDifficulty}`, new Set());
  assert.ok(r1.rows[0].errors.some((e) => e.includes("difficulty is required")));

  const noTime = "QA,N,,,MCQ,3,,true,Q?, ,1,2,3,4,,,,true,false,false,false,,";
  const r2 = parseImportCsv(`${header}\n${noTime}`, new Set());
  assert.ok(r2.rows[0].errors.some((e) => e.includes("time_seconds is required")));
});

test("parseImportCsv enforces the row limit", () => {
  const header = CSV.split("\n")[0];
  const many = Array.from({ length: IMPORT_MAX_ROWS + 5 }, (_, i) =>
    `QA,T${i},,,MCQ,3,60,true,Question number ${i}?,,1,2,3,4,,,,true,false,false,false,,`).join("\n");
  const result = parseImportCsv(`${header}\n${many}`, new Set());
  assert.equal(result.limitExceeded, true);
  const flagged = result.rows.filter((r) => r.errors.some((e) => e.includes("Row limit exceeded.")));
  assert.equal(flagged.length, 5);
});