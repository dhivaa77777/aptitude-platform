export type QuestionType = "MCQ" | "MULTI";
export type QuestionStatus = "ACTIVE" | "REVIEW_REQUIRED" | "DISABLED";
export type TagType = "FIELD" | "CATEGORY" | "TOPIC" | "SUBTOPIC";
export type GroupType = "DI_TABLE" | "DI_CHART" | "RC_PASSAGE" | "CASELET";

export const QUESTION_TYPES: QuestionType[] = ["MCQ", "MULTI"];
export const QUESTION_STATUSES: QuestionStatus[] = [
  "ACTIVE",
  "REVIEW_REQUIRED",
  "DISABLED",
];
export const TAG_TYPES: TagType[] = ["FIELD", "CATEGORY", "TOPIC", "SUBTOPIC"];
export const GROUP_TYPES: GroupType[] = [
  "DI_TABLE",
  "DI_CHART",
  "RC_PASSAGE",
  "CASELET",
];

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const IMPORT_MAX_ROWS = 1000;

export interface QuestionOptionInput {
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface QuestionTagInput {
  tag_type: TagType;
  tag_value: string;
}

export interface QuestionInput {
  question_text: string;
  question_type: QuestionType;
  explanation: string;
  assigned_difficulty: number;
  estimated_time_seconds: number;
  shuffle_options: boolean;
  group_id: string | null;
  status: QuestionStatus;
  options: QuestionOptionInput[];
  tags: QuestionTagInput[];
}

export const IMPORT_CSV_HEADERS = [
  "field",
  "category",
  "topic",
  "subtopic",
  "type",
  "difficulty",
  "time_seconds",
  "shuffle",
  "question_text",
  "explanation",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "option_5",
  "option_6",
  "correct_1",
  "correct_2",
  "correct_3",
  "correct_4",
  "correct_5",
  "correct_6",
] as const;