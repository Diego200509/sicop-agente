import type { BudgetRecord, BudgetReport } from "@/src/features/budget/types/budget.types";
import { formatCurrency, formatPlainNumber } from "@/src/features/budget/utils/budget-formatters";

const PHASE_DISPLAY_ORDER = [
  "planificacion",
  "analisis de requerimientos",
  "diseno",
  "desarrollo",
  "seguimiento y control",
];

export function getBudgetRecord(report: BudgetReport | null | undefined): BudgetRecord | null {
  const value = report?.presupuesto;
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as BudgetRecord) : null;
}

export function hasBudgetData(report: BudgetReport | null | undefined): boolean {
  if (!report) return false;
  const budget = getBudgetRecord(report);

  return Boolean(
    budget ||
      report.presupuesto_total ||
      report.costo_real_total ||
      report.variacion_costo ||
      report.ejecucion_presupuestaria ||
      report.estado_presupuesto,
  );
}

export function getBudgetInterpretation(report: BudgetReport | null | undefined): string | null {
  return getTextValue(getBudgetRecord(report), [
    "interpretacion",
    "interpretaci\u00f3n",
    "interpretation",
    "analisis",
    "an\u00e1lisis",
  ]);
}

export function getBudgetNumber(record: BudgetRecord | null, keys: string[]): number | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const numericValue = Number(value.replace(",", "."));
      if (Number.isFinite(numericValue)) return numericValue;
    }
  }

  return null;
}

export function getTextValue(record: BudgetRecord | null, keys: string[]): string | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}

export function getDisplayValue(record: BudgetRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return formatPlainNumber(value);
  }

  return fallback;
}

export function getMoneyValue(record: BudgetRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return formatCurrency(value);
    if (typeof value === "string" && value.trim()) {
      const numericValue = Number(value.replace(",", "."));
      return Number.isFinite(numericValue) ? formatCurrency(numericValue) : value.trim();
    }
  }

  return formatCurrency(0);
}

export function getPhaseRows(report: BudgetReport | null | undefined): BudgetRecord[] {
  const rows = toRecords(getBudgetRecord(report)?.detalle_por_fase);
  return sortPhaseRows(rows);
}

export function getTaskRows(report: BudgetReport | null | undefined): BudgetRecord[] {
  return toRecords(getBudgetRecord(report)?.detalle_por_tarea);
}

export function toRecords(value: unknown): BudgetRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is BudgetRecord =>
        item != null && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (value != null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      if (item == null || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as BudgetRecord;
      return [{ fase: key, ...record }];
    });
  }

  return [];
}

function sortPhaseRows(rows: BudgetRecord[]): BudgetRecord[] {
  return [...rows].sort((left, right) => getPhaseOrderIndex(left) - getPhaseOrderIndex(right));
}

function getPhaseOrderIndex(row: BudgetRecord): number {
  const phaseName = getDisplayValue(row, ["fase", "nombre", "nombre_fase"], "");
  const index = PHASE_DISPLAY_ORDER.indexOf(normalizePhaseName(phaseName));
  return index >= 0 ? index : PHASE_DISPLAY_ORDER.length;
}

function normalizePhaseName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

