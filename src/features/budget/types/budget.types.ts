import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";

export type BudgetStatus =
  | "ahorro"
  | "dentro_presupuesto"
  | "en_ejecucion"
  | "exacto"
  | "sobrecosto"
  | "sin_datos"
  | string;

export type BudgetRecord = Record<string, unknown>;

export type BudgetReport = ReporteSeguimiento;

