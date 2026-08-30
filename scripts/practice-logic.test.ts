import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isRecentlySeen,
  selectQuestionIds,
  weightedPick,
  optionSeed,
  seededShuffle,
  mulberry32,
  type Candidate,
} from "../lib/practice/selection";

function candidate(
  id: string,
  timesSeen: number,
  lastSeenAt: string | null,
): Candidate {
  return { id, timesSeen, lastSeenAt };
}

const NOW = Date.parse("2026-08-30T12:00:00Z");
const DAY = 86_400_000;

test("isRecentlySeen boundary: seen within cutoff is excluded, exactly-cutoff and older are eligible", () => {
  assert.equal(isRecentlySeen(new Date(NOW - DAY).toISOString(), NOW, 14), true);
  assert.equal(isRecentlySeen(new Date(NOW - 13 * DAY).toISOString(), NOW, 14), true);
  assert.equal(isRecentlySeen(null, NOW, 14), false);
  assert.equal(isRecentlySeen(new Date(NOW - 14 * DAY).toISOString(), NOW, 14), false);
  assert.equal(isRecentlySeen(new Date(NOW - 20 * DAY).toISOString(), NOW, 14), false);
  assert.equal(isRecentlySeen("not-a-date", NOW, 14), false);
});

test("selectQuestionIds picks unseen candidates first (weighted, without replacement)", () => {
  const candidates: Candidate[] = [
    candidate("a", 0, null),
    candidate("b", 0, null),
    candidate("c", 5, new Date(NOW - 100 * DAY).toISOString()),
  ];
  const chosen = selectQuestionIds(candidates, {
    requested: 3,
    cutoffDays: 14,
    now: NOW,
    random: () => 0.0001,
  });
  assert.equal(chosen.length, 3);
  assert.equal(new Set(chosen).size, 3);
  assert.deepEqual(chosen, ["a", "b", "c"]);
});

test("selectQuestionIds falls back to previously-seen when pool is too small", () => {
  const candidates: Candidate[] = [
    candidate("old", 0, new Date(NOW - 30 * DAY).toISOString()),
    candidate("recent", 0, new Date(NOW - 1 * DAY).toISOString()),
  ];
  const chosen = selectQuestionIds(candidates, {
    requested: 2,
    cutoffDays: 14,
    now: NOW,
  });
  // "old" is eligible; the requested count exceeds the eligible pool, so the
  // previously-seen "recent" is included as fallback.
  assert.deepEqual(chosen, ["old", "recent"]);
});

test("selectQuestionIds falls back to previously-seen oldest-first when pool is too small", () => {
  const candidates: Candidate[] = [
    candidate("recentA", 1, new Date(NOW - 1 * DAY).toISOString()),
    candidate("recentB", 1, new Date(NOW - 3 * DAY).toISOString()),
    candidate("recentC", 1, new Date(NOW - 2 * DAY).toISOString()),
  ];
  const chosen = selectQuestionIds(candidates, {
    requested: 2,
    cutoffDays: 14,
    now: NOW,
  });
  // No eligible questions: fall back in order of oldest last_seen_at first.
  assert.deepEqual(chosen, ["recentB", "recentC"]);
});

test("selectQuestionIds returns at most the pool size", () => {
  const candidates: Candidate[] = [
    candidate("x", 0, null),
    candidate("y", 0, null),
  ];
  const chosen = selectQuestionIds(candidates, {
    requested: 10,
    cutoffDays: 14,
    now: NOW,
  });
  assert.equal(chosen.length, 2);
});

test("weightedPick strongly prefers the unseen candidate", () => {
  const candidates: Candidate[] = [
    candidate("never", 0, null),
    candidate("seen1", 1, new Date(NOW - 30 * DAY).toISOString()),
    candidate("seen9", 9, new Date(NOW - 30 * DAY).toISOString()),
  ];
  const picked = new Array<string>();
  for (let i = 0; i < 200; i += 1) {
    picked.push(weightedPick(candidates, 1, Math.random)[0]);
  }
  const neverCount = picked.filter((id) => id === "never").length;
  assert.ok(neverCount > 100, `expected ~62% never seen, got ${neverCount}`);
});

test("mulberry32 is deterministic for a fixed seed and varies across seeds", () => {
  const a = Array.from({ length: 5 }, mulberry32(12345));
  const b = Array.from({ length: 5 }, mulberry32(12345));
  const c = Array.from({ length: 5 }, mulberry32(67890));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  a.forEach((v) => assert.ok(v >= 0 && v < 1));
});

test("seededShuffle is deterministic and permutation-preserving", () => {
  const items = ["w", "x", "y", "z"];
  const s1 = seededShuffle(items, 42);
  const s2 = seededShuffle(items, 42);
  const s3 = seededShuffle(items, 43);
  assert.deepEqual(s1, s2);
  assert.notDeepEqual(s1, s3);
  items.forEach((item) => assert.ok(s1.includes(item)));
});

test("optionSeed is stable per (attempt, question) and differs across inputs", () => {
  assert.equal(optionSeed("attempt-1", "question-1"), optionSeed("attempt-1", "question-1"));
  assert.notEqual(optionSeed("attempt-1", "question-1"), optionSeed("attempt-1", "question-2"));
  assert.notEqual(optionSeed("attempt-1", "question-1"), optionSeed("attempt-2", "question-1"));
  assert.ok(Number.isSafeInteger(optionSeed("a", "b")));
});