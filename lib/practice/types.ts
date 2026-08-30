export interface PracticeFilters {
  field?: string | null;
  topic?: string | null;
  difficulty?: number | null;
  count: number;
}

export interface PracticeAnswerRequest {
  attemptId: string;
  attemptQuestionId: string;
  selectedOptionId: string;
  timeSpentSeconds?: number;
}

export interface PracticeAnswerResult {
  correct: boolean;
  correctOptionId: string;
  explanation: string | null;
}

export interface PracticeCompleteResult {
  total: number;
  correct: number;
  score: number;
  accuracy: number;
}

export interface PracticeOptionPayload {
  id: string;
  text: string;
  label: string;
}

export interface PracticeQuestionPayload {
  index: number;
  attemptQuestionId: string;
  questionId: string;
  questionText: string;
  options: PracticeOptionPayload[];
}

export interface PracticeStartPayload {
  attemptId: string;
  total: number;
  questions: PracticeQuestionPayload[];
}

export const MAX_PRACTICE_COUNT = 30;
export const DEFAULT_PRACTICE_COUNT = 10;
export const DEFAULT_CUTOFF_DAYS = 14;