const PHASES_WITH_CODE_REVIEW = new Set([
  "desarrollo",
  "seguimiento y control",
]);

export const FASES_TABLERO: { key: string; titulo: string }[] = [
  { key: "planificacion", titulo: "Planificación" },
  { key: "analisis de requerimientos", titulo: "Análisis de requerimientos" },
  { key: "diseno", titulo: "Diseño" },
  { key: "desarrollo", titulo: "Desarrollo" },
  { key: "seguimiento y control", titulo: "Seguimiento y control" },
  { key: "cierre", titulo: "Cierre" },
];

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

export type PhaseMode = "documental" | "mixto";

export function getPhaseMode(fase: string | null | undefined): PhaseMode {
  if (!normalizePhase(fase)) {
    return "documental";
  }
  return requiresCodeReviewByPhase(fase) ? "mixto" : "documental";
}
