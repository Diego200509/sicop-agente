import Link from "next/link";

import { BudgetProgressBar } from "@/src/features/budget/components/budget-progress-bar";
import { BudgetStatusBadge } from "@/src/features/budget/components/budget-status-badge";
import { BudgetSummaryCards } from "@/src/features/budget/components/budget-summary-cards";
import type { BudgetReport } from "@/src/features/budget/types/budget.types";
import { getBudgetInterpretation } from "@/src/features/budget/utils/budget-mappers";

type BudgetExecutiveSummaryProps = {
  reporte: BudgetReport;
  showDetailLink?: boolean;
};

export function BudgetExecutiveSummary({ reporte, showDetailLink = false }: BudgetExecutiveSummaryProps) {
  const interpretation = getBudgetInterpretation(reporte);

  return (
    <section className="space-y-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Presupuesto</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Resumen ejecutivo del control presupuestario de este reporte.
          </p>
        </div>
        <BudgetStatusBadge estado={reporte.estado_presupuesto ?? "sin_datos"} />
      </div>

      <BudgetSummaryCards reporte={reporte} />
      <BudgetProgressBar value={reporte.ejecucion_presupuestaria ?? 0} />

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        {interpretation || "No existe interpretacion presupuestaria disponible para este reporte."}
      </div>

      {showDetailLink ? (
        <Link
          href={`/presupuesto?reporteId=${encodeURIComponent(reporte.id)}`}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Ver detalle presupuestario
        </Link>
      ) : null}
    </section>
  );
}

