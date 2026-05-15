"use client";

import { ChevronDown, DollarSign, Gauge, LineChart, PiggyBank, ReceiptText } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { cn } from "@/src/lib/utils";
import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";

type BudgetStatus =
  | "ahorro"
  | "dentro_presupuesto"
  | "en_ejecucion"
  | "exacto"
  | "sobrecosto"
  | "sin_datos"
  | string;
type BudgetRecord = Record<string, unknown>;

const budgetNumberFormat = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentNumberFormat = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function BudgetSection({ reporte }: { reporte: ReporteSeguimiento }) {
  const presupuesto = asRecord(reporte.presupuesto);
  const phaseRows = toRecords(presupuesto?.detalle_por_fase);
  const taskRows = toRecords(presupuesto?.detalle_por_tarea);
  const interpretation = getTextValue(presupuesto, [
    "interpretacion",
    "interpretaci\u00f3n",
    "interpretation",
    "analisis",
    "an\u00e1lisis",
  ]);

  return (
    <section className="space-y-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Presupuesto</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Control presupuestario registrado contra el presupuesto inicial total del proyecto.
          </p>
        </div>
        <BudgetStatusBadge estado={reporte.estado_presupuesto ?? "sin_datos"} />
      </div>

      <BudgetSummaryCards reporte={reporte} />
      <BudgetProgressBar value={reporte.ejecucion_presupuestaria ?? 0} />

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        {interpretation || "No existe interpretacion presupuestaria disponible para este reporte."}
      </div>

      {phaseRows.length > 0 ? <BudgetPhaseTable rows={phaseRows} /> : null}
      {taskRows.length > 0 ? <BudgetTaskTable rows={taskRows} /> : null}
    </section>
  );
}

export function BudgetSummaryCards({ reporte }: { reporte: ReporteSeguimiento }) {
  const items = [
    {
      label: "Presupuesto estimado total del proyecto",
      value: formatMoney(reporte.presupuesto_total ?? 0),
      icon: PiggyBank,
      tone: "sky",
    },
    {
      label: "Costo real acumulado",
      value: formatMoney(reporte.costo_real_total ?? 0),
      icon: ReceiptText,
      tone: "zinc",
    },
    {
      label: "Variacion o saldo disponible",
      value: formatMoney(reporte.variacion_costo ?? 0),
      icon: LineChart,
      tone: getBudgetTone(reporte.estado_presupuesto),
    },
    {
      label: "Ejecucion presupuestaria real",
      value: `${formatPercent(reporte.ejecucion_presupuestaria ?? 0)}%`,
      icon: Gauge,
      tone: getExecutionTone(reporte.ejecucion_presupuestaria ?? 0),
    },
    {
      label: "Estado presupuestario",
      value: normalizeBudgetStatus(reporte.estado_presupuesto ?? "sin_datos"),
      icon: DollarSign,
      tone: getBudgetTone(reporte.estado_presupuesto),
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className="mt-1 truncate text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50" title={value}>
                {value}
              </p>
            </div>
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", toneClass(tone))}>
              <Icon className="size-4" aria-hidden />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BudgetProgressBar({ value }: { value: number | null | undefined }) {
  const percent = Number.isFinite(value) ? Number(value) : 0;
  const width = Math.max(0, Math.min(percent, 100));
  const hasOverrun = percent > 100;

  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Ejecucion presupuestaria real</p>
        <p className={cn("text-sm font-semibold tabular-nums", hasOverrun ? "text-rose-600 dark:text-rose-300" : "text-zinc-700 dark:text-zinc-200")}>
          {formatPercent(percent)}% ejecutado
        </p>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.max(0, Math.min(percent, 100))}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            hasOverrun
              ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
              : "bg-gradient-to-r from-sky-500 to-emerald-500",
          )}
          style={{ width: `${width}%` }}
        />
        {hasOverrun ? (
          <div className="absolute inset-y-0 right-0 w-8 bg-rose-500/80 shadow-[0_0_16px_rgba(244,63,94,0.7)]" />
        ) : null}
      </div>
      {hasOverrun ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-300">
          Ejecucion superior al 100%; el reporte registra sobrecosto.
        </p>
      ) : null}
    </div>
  );
}

export function BudgetStatusBadge({ estado }: { estado: BudgetStatus }) {
  const normalized = normalizeBudgetStatus(estado);
  const variant =
    normalized === "ahorro"
      ? "success"
      : normalized === "sobrecosto"
        ? "danger"
        : normalized === "dentro_presupuesto" || normalized === "en_ejecucion"
          ? "secondary"
          : "info";

  return (
    <Badge variant={variant} className="w-fit capitalize">
      {normalized.replace(/_/g, " ")}
    </Badge>
  );
}

export function BudgetPhaseTable({ rows }: { rows: BudgetRecord[] }) {
  return (
    <BudgetTable title="Detalle por fase">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-100/80 hover:bg-zinc-100/80 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
            <TableHead>Fase</TableHead>
            <TableHead className="text-right">Costo estimado</TableHead>
            <TableHead className="text-right">Costo real</TableHead>
            <TableHead className="text-right">Variacion</TableHead>
            <TableHead className="text-right">Tareas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${getDisplayValue(row, ["fase", "nombre", "nombre_fase"], "Fase")}-${index}`}>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {getDisplayValue(row, ["fase", "nombre", "nombre_fase"], "Sin fase")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoneyLike(row, ["costo_estimado", "presupuesto_estimado", "costo_planificado", "estimado"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoneyLike(row, ["costo_real", "real", "costo_real_total"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoneyLike(row, ["variacion", "variacion_costo", "desviacion"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getDisplayValue(row, ["numero_tareas", "num_tareas", "tareas", "cantidad_tareas", "total_tareas"], "0")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </BudgetTable>
  );
}

export function BudgetTaskTable({ rows }: { rows: BudgetRecord[] }) {
  return (
    <details className="group rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <span>Detalle por tarea</span>
        <ChevronDown className="size-4 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="scrollbar-elegant overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-100/80 hover:bg-zinc-100/80 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
              <TableHead>Tarea</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead className="text-right">Costo estimado</TableHead>
              <TableHead className="text-right">Costo real</TableHead>
              <TableHead className="text-right">Horas estimadas</TableHead>
              <TableHead className="text-right">Horas trabajadas</TableHead>
              <TableHead>Responsable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${getDisplayValue(row, ["tarea", "titulo", "nombre"], "Tarea")}-${index}`}>
                <TableCell className="min-w-[14rem] font-medium text-zinc-900 dark:text-zinc-50">
                  {getDisplayValue(row, ["tarea", "titulo", "nombre", "nombre_tarea"], "Sin tarea")}
                </TableCell>
                <TableCell>{getDisplayValue(row, ["fase", "nombre_fase"], "Sin fase")}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyLike(row, ["costo_estimado", "presupuesto_estimado", "estimado"])}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyLike(row, ["costo_real", "real"])}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {getDisplayValue(row, ["horas_estimadas", "horas_planificadas", "estimacion_horas"], "0")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {getDisplayValue(row, ["horas_trabajadas", "horas_reales", "horas"], "0")}
                </TableCell>
                <TableCell className="min-w-[12rem]">
                  {getDisplayValue(row, ["recurso_responsable", "responsable", "recurso", "asignado_a"], "Sin responsable")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

function BudgetTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h4>
      </div>
      <div className="scrollbar-elegant overflow-x-auto">{children}</div>
    </div>
  );
}

function asRecord(value: unknown): BudgetRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as BudgetRecord) : null;
}

function toRecords(value: unknown): BudgetRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is BudgetRecord => item != null && typeof item === "object" && !Array.isArray(item));
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

function getTextValue(record: BudgetRecord | null, keys: string[]): string | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getDisplayValue(record: BudgetRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return formatPlainNumber(value);
  }

  return fallback;
}

function formatMoneyLike(record: BudgetRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return formatMoney(value);
    if (typeof value === "string" && value.trim()) {
      const numericValue = Number(value.replace(",", "."));
      return Number.isFinite(numericValue) ? formatMoney(numericValue) : value.trim();
    }
  }

  return formatMoney(0);
}

function formatMoney(value: number): string {
  return budgetNumberFormat.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number): string {
  return percentNumberFormat.format(Number.isFinite(value) ? value : 0);
}

function formatPlainNumber(value: number): string {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function normalizeBudgetStatus(estado: BudgetStatus): string {
  if (typeof estado !== "string") return "sin_datos";

  const normalized = estado.trim().toLowerCase();
  if (!normalized) return "sin_datos";
  if (normalized === "exacto") return "en_ejecucion";
  return normalized;
}

function getBudgetTone(estado: BudgetStatus | null | undefined): "emerald" | "blue" | "rose" | "sky" {
  const normalized = normalizeBudgetStatus(estado ?? "sin_datos");
  if (normalized === "ahorro" || normalized === "dentro_presupuesto") return "emerald";
  if (normalized === "sobrecosto") return "rose";
  if (normalized === "en_ejecucion") return "blue";
  return "sky";
}

function getExecutionTone(value: number): "emerald" | "blue" | "rose" | "sky" {
  if (!Number.isFinite(value) || value === 0) return "sky";
  if (value > 100) return "rose";
  if (value === 100) return "blue";
  return "emerald";
}

function toneClass(tone: "emerald" | "blue" | "rose" | "sky" | "zinc") {
  return {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  }[tone];
}
