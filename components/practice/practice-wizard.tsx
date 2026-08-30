"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { OptionsList } from "@/components/practice/options-list";

interface OptionPayload {
  id: string;
  text: string;
  label: string;
}

interface QuestionPayload {
  index: number;
  attemptQuestionId: string;
  questionId: string;
  questionText: string;
  options: OptionPayload[];
}

interface StartPayload {
  attemptId: string;
  total: number;
  questions: QuestionPayload[];
}

interface AnswerRecord {
  correct: boolean;
  correctOptionId: string;
  explanation: string | null;
}

type Phase = "setup" | "active" | "done";

const COUNT_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS = [1, 2, 3, 4, 5];

export function PracticeWizard() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [tags, setTags] = useState<{ fields: string[]; topics: string[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [field, setField] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(10);
  const [starting, setStarting] = useState(false);

  const [started, setStarted] = useState<StartPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ total: number; correct: number; score: number } | null>(null);

  useEffect(() => {
    fetch("/api/practice/options")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load practice options.");
        return r.json();
      })
      .then((data) => setTags(data))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load options."));
  }, []);

  const answeredCount = started
    ? started.questions.filter((q) => answers[q.attemptQuestionId]).length
    : 0;
  const allAnswered = started !== null && answeredCount === started.total;
  const current = started?.questions[index] ?? null;
  const currentAnswered = current ? answers[current.attemptQuestionId] : undefined;

  const startPractice = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: field || null,
          topic: topic || null,
          difficulty: difficulty === "" ? null : Number(difficulty),
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start practice.");
      }
      setStarted(data);
      setIndex(0);
      setAnswers({});
      setPhase("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start practice.");
    } finally {
      setStarting(false);
    }
  }, [field, topic, difficulty, count]);

  const checkAnswer = useCallback(async () => {
    if (!started || !current || !selectedOptionId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: started.attemptId,
          attemptQuestionId: current.attemptQuestionId,
          selectedOptionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to record answer.");
      }
      setAnswers((prev) => ({
        ...prev,
        [current.attemptQuestionId]: {
          correct: data.correct,
          correctOptionId: data.correctOptionId,
          explanation: data.explanation ?? null,
        },
      }));
      setSelectedOptionId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record answer.");
    } finally {
      setSubmitting(false);
    }
  }, [started, current, selectedOptionId, submitting]);

  const finish = useCallback(async () => {
    if (!started || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: started.attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to finish practice.");
      }
      setSummary(data);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finish practice.");
    } finally {
      setSubmitting(false);
    }
  }, [started, submitting]);

  if (phase === "done" && summary) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Practice done</h2>
        <p className="mt-2 text-sm text-muted">
          You answered {summary.correct} of {summary.total} correctly.
        </p>
        <div className="mt-6 text-5xl font-bold text-primary">{summary.score}%</div>
        <Button className="mt-8 w-full" onClick={() => { setPhase("setup"); setStarted(null); setSummary(null); setAnswers({}); }}>
          Practice again
        </Button>
      </Card>
    );
  }

  if (phase === "active" && started && current) {
    const record = currentAnswered;
    const progress = Math.round((answeredCount / started.total) * 100);
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            Question {current.index} of {started.total}
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="primary">{answeredCount} answered</Badge>
            <Badge tone="neutral">No timer</Badge>
          </div>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <Card className="mt-6">
          <h2 className="text-lg font-medium leading-relaxed">{current.questionText}</h2>
        </Card>

        <div className="mt-6">
          <OptionsList
            options={current.options}
            selectedId={selectedOptionId ?? record?.correctOptionId ?? null}
            onChange={(id) => {
              if (!record) setSelectedOptionId(id);
            }}
            showCorrect={Boolean(record)}
            correctId={record ? record.correctOptionId : null}
          />
        </div>

        {record && (
          <Card className="mt-6">
            <div className="text-sm font-medium text-success">
              {record.correct ? "Correct" : "Not correct"}
            </div>
            {record.explanation && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{record.explanation}</p>
            )}
          </Card>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Previous
          </Button>
          {record ? (
            index < started.total - 1 ? (
              <Button onClick={() => setIndex((i) => i + 1)}>Next question</Button>
            ) : (
              <Button onClick={finish} disabled={!allAnswered || submitting}>
                Finish practice
              </Button>
            )
          ) : (
            <Button onClick={checkAnswer} disabled={!selectedOptionId || submitting}>
              Check answer
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a field and topic. The engine avoids questions you saw in the last 14 days.
      </p>

      {loadError && <p className="mt-4 text-sm text-danger">{loadError}</p>}

      <Card className="mt-8 max-w-lg">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-muted">Field (optional)</label>
            <Select value={field} onChange={(e) => setField(e.target.value)} disabled={!tags}>
              <option value="">Any field</option>
              {(tags?.fields ?? []).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Topic (optional)</label>
            <Select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!tags}>
              <option value="">Any topic</option>
              {(tags?.topics ?? []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Difficulty (optional)</label>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Any level</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Level {d}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Number of questions</label>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  className={`h-9 rounded-lg border px-4 text-sm transition-colors ${
                    count === c
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-surface-2 text-muted hover:bg-surface-3"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button className="w-full" onClick={startPractice} disabled={starting || !tags}>
            {starting ? "Starting…" : "Start practice"}
          </Button>
        </div>
      </Card>
    </>
  );
}