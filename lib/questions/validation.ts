import type {
  QuestionInput,
  QuestionStatus,
  QuestionType,
  TagType,
} from "./types";

const QUESTION_STATUSES: QuestionStatus[] = [
  "ACTIVE",
  "REVIEW_REQUIRED",
  "DISABLED",
];
const QUESTION_TYPES: QuestionType[] = ["MCQ", "MULTI"];
const TAG_TYPES: TagType[] = ["FIELD", "CATEGORY", "TOPIC", "SUBTOPIC"];

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateQuestion(input: QuestionInput): string[] {
  const errors: string[] = [];

  if (!hasText(input.question_text)) {
    errors.push("question_text is required.");
  } else if (input.question_text.length > 2000) {
    errors.push("question_text exceeds 2000 characters.");
  }

  if (!QUESTION_TYPES.includes(input.question_type)) {
    errors.push("question_type must be MCQ or MULTI.");
  }

  if (
    !Number.isInteger(input.assigned_difficulty) ||
    input.assigned_difficulty < 1 ||
    input.assigned_difficulty > 5
  ) {
    errors.push("difficulty must be an integer between 1 and 5.");
  }

  if (
    !Number.isInteger(input.estimated_time_seconds) ||
    input.estimated_time_seconds < 5 ||
    input.estimated_time_seconds > 3600
  ) {
    errors.push("estimated_time_seconds must be between 5 and 3600.");
  }

  if (!QUESTION_STATUSES.includes(input.status)) {
    errors.push("status must be ACTIVE, REVIEW_REQUIRED or DISABLED.");
  }

  const opts = Array.isArray(input.options) ? input.options : [];
  if (opts.length < 2) {
    errors.push("A question needs at least 2 options.");
  } else if (opts.length > 6) {
    errors.push("A question cannot have more than 6 options.");
  }

  const correctCount = opts.filter((o) => o.is_correct).length;
  if (correctCount === 0) {
    errors.push("At least one option must be marked correct.");
  }
  if (input.question_type === "MCQ" && correctCount > 1) {
    errors.push("MCQ questions must have exactly one correct option.");
  }

  const seenOrders = new Set<number>();
  opts.forEach((o, idx) => {
    if (!hasText(o.option_text)) {
      errors.push(`Option ${idx + 1} is missing text.`);
    } else if (o.option_text.length > 2000) {
      errors.push(`Option ${idx + 1} exceeds 2000 characters.`);
    }
    if (seenOrders.has(o.display_order)) {
      errors.push("Option display_order values must be unique.");
    }
    seenOrders.add(o.display_order);
  });

  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (tags.length === 0) {
    errors.push("At least one tag is required.");
  }
  const seenTagTypes = new Set<TagType>();
  for (const t of tags) {
    if (!TAG_TYPES.includes(t.tag_type)) {
      errors.push("tag_type must be FIELD, CATEGORY, TOPIC or SUBTOPIC.");
    }
    if (!hasText(t.tag_value)) {
      errors.push("Tag value cannot be empty.");
    } else if (t.tag_value.length > 200) {
      errors.push("Tag value exceeds 200 characters.");
    }
    if (seenTagTypes.has(t.tag_type)) {
      errors.push(`Duplicate tag type: ${t.tag_type}. Each type appears once.`);
    }
    seenTagTypes.add(t.tag_type);
  }

  if (
    input.explanation &&
    typeof input.explanation === "string" &&
    input.explanation.length > 4000
  ) {
    errors.push("explanation exceeds 4000 characters.");
  }

  return errors;
}