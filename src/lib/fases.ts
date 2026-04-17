const PHASES_WITH_CODE_REVIEW = new Set([
  "desarrollo",
  "seguimiento y control",
]);

export function normalizePhase(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

export function requiresCodeReviewByPhase(phase: string | null | undefined): boolean {
  return PHASES_WITH_CODE_REVIEW.has(normalizePhase(phase));
}
