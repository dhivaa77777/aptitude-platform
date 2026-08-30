export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isDuplicateText(
  candidate: string,
  existing: ReadonlySet<string>,
): boolean {
  return existing.has(normalizeText(candidate));
}