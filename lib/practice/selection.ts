/**
 * Practice selection engine (MASTERPLAN.md §5 — exact spec):
 * 1. Exclude any question whose user_question_history.last_seen_at is within
 *    the last `cutoffDays` for this user.
 * 2. Among the remaining eligible pool, weight selection inversely by
 *    `times_seen` (never-seen questions get the highest weight).
 * 3. If the eligible pool is smaller than the requested count, fall back to
 *    previously-seen questions ordered oldest-last_seen_at first, rather than
 *    failing to fill the set.
 */

export interface Candidate {
  id: string;
  /** Stored on user_question_history.times_seen; 0 when never seen. */
  timesSeen: number;
  /** ISO timestamp of last_seen_at, or null when never seen. */
  lastSeenAt: string | null;
}

export interface SelectionOptions {
  requested: number;
  cutoffDays: number;
  /** Epoch ms — injectable for tests. Defaults to Date.now(). */
  now?: number;
  /** Injectable RNG (0..1) — defaults to Math.random. */
  random?: () => number;
}

const MS_PER_DAY = 86_400_000;

export function isRecentlySeen(
  lastSeenAt: string | null,
  now: number,
  cutoffDays: number,
): boolean {
  if (!lastSeenAt) return false;
  const seenAt = Date.parse(lastSeenAt);
  if (Number.isNaN(seenAt)) return false;
  return now - seenAt < cutoffDays * MS_PER_DAY;
}

function weight(candidate: Candidate): number {
  return 1 / (candidate.timesSeen + 1);
}

/** Weighted sampling without replacement; unseen / rarely-seen wins. */
export function weightedPick(
  candidates: readonly Candidate[],
  requested: number,
  random: () => number,
): string[] {
  const pool = candidates.slice();
  const chosen: string[] = [];
  while (pool.length > 0 && chosen.length < requested) {
    const total = pool.reduce((sum, c) => sum + weight(c), 0);
    let r = random() * total;
    let index = 0;
    for (let i = 0; i < pool.length; i += 1) {
      r -= weight(pool[i]);
      if (r <= 0) {
        index = i;
        break;
      }
    }
    chosen.push(pool[index].id);
    pool.splice(index, 1);
  }
  return chosen;
}

export function selectQuestionIds(
  candidates: readonly Candidate[],
  options: SelectionOptions,
): string[] {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;

  const eligible = candidates.filter(
    (c) => !isRecentlySeen(c.lastSeenAt, now, options.cutoffDays),
  );
  const chosen = weightedPick(eligible, options.requested, random);
  const chosenSet = new Set(chosen);

  if (chosen.length < options.requested) {
    const previouslySeen = candidates
      .filter((c) => !chosenSet.has(c.id) && c.lastSeenAt !== null)
      .sort(
        (a, b) =>
          Date.parse(a.lastSeenAt as string) -
          Date.parse(b.lastSeenAt as string),
      );
    for (const candidate of previouslySeen) {
      if (chosen.length >= options.requested) break;
      chosen.push(candidate.id);
      chosenSet.add(candidate.id);
    }
  }

  return chosen;
}

/**
 * Deterministic 1:1 map from (attempt_id, question_id) -> 32-bit seed
 * (MASTERPLAN.md §2 rule #2). Only the seed is persisted; the displayed option
 * order is derived from it at render time on every serve.
 */
export function optionSeed(attemptId: string, questionId: string): number {
  const value = `practice:${attemptId}:${questionId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle driven by a seeded PRNG. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = items.slice();
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}