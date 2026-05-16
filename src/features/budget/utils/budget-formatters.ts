import type { BudgetStatus } from "@/src/features/budget/types/budget.types";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const plainNumberFormatter = new Intl.NumberFormat("es-EC", {
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(Number.isFinite(value) ? Number(value) : 0);
}

export function formatPercent(value: number | null | undefined): string {
  return percentFormatter.format(Number.isFinite(value) ? Number(value) : 0);
}

export function formatPlainNumber(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : plainNumberFormatter.format(Number(value));
}

export function formatBudgetStatus(status: BudgetStatus | null | undefined): string {
  if (typeof status !== "string") return "sin_datos";

  const normalized = status.trim().toLowerCase();
  if (!normalized) return "sin_datos";
  if (normalized === "exacto") return "en_ejecucion";
  return normalized;
}

export function getBudgetStatusLabel(status: BudgetStatus | null | undefined): string {
  const normalized = formatBudgetStatus(status);
  const labels: Record<string, string> = {
    ahorro: "Ahorro",
    dentro_presupuesto: "Dentro presupuesto",
    en_ejecucion: "En ejecucion",
    exacto: "En ejecucion",
    sobrecosto: "Sobrecosto",
    sin_datos: "Sin datos",
  };

  return labels[normalized] ?? normalized.replace(/_/g, " ");
}

export function getBudgetStatusColor(
  status: BudgetStatus | null | undefined,
): "emerald" | "blue" | "rose" | "sky" {
  const normalized = formatBudgetStatus(status);
  if (normalized === "ahorro" || normalized === "dentro_presupuesto") return "emerald";
  if (normalized === "sobrecosto") return "rose";
  if (normalized === "en_ejecucion") return "blue";
  return "sky";
}

export function getBudgetBadgeVariant(
  status: BudgetStatus | null | undefined,
): "success" | "danger" | "secondary" | "info" {
  const normalized = formatBudgetStatus(status);
  if (normalized === "ahorro" || normalized === "dentro_presupuesto") return "success";
  if (normalized === "sobrecosto") return "danger";
  if (normalized === "en_ejecucion") return "secondary";
  return "info";
}

export function getProgressBarValue(value: number | null | undefined): number {
  const percent = Number.isFinite(value) ? Number(value) : 0;
  return Math.max(0, Math.min(percent, 100));
}

export function formatBudgetDate(value: string | null | undefined, fallback = "Sin fecha"): string {
  if (!value) return fallback;

  const date = parseDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeZone: "America/Guayaquil",
  }).format(date);
}

function parseDate(value: string): Date | null {
  const trimmedValue = value.trim();
  const simpleDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmedValue);

  if (simpleDateMatch) {
    const [, day, month, year] = simpleDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}
