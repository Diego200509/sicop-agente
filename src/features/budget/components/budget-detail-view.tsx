import { BudgetPhaseTable } from "@/src/features/budget/components/budget-phase-table";
import { BudgetProgressBar } from "@/src/features/budget/components/budget-progress-bar";
import { BudgetSummaryCards } from "@/src/features/budget/components/budget-summary-cards";
import { BudgetTaskTable } from "@/src/features/budget/components/budget-task-table";
import { SectionCard } from "@/src/features/budget/components/section-card";
import type { BudgetReport } from "@/src/features/budget/types/budget.types";
import {
  getBudgetInterpretation,
  getPhaseRows,
  getTaskRows,
  hasBudgetData,
} from "@/src/features/budget/utils/budget-mappers";

export function BudgetDetailView({ reporte }: { reporte: BudgetReport }) {
  const interpretation = getBudgetInterpretation(reporte);
  const phaseRows = getPhaseRows(reporte);
  const taskRows = getTaskRows(reporte);
  const hasData = hasBudgetData(reporte);

  return (
    <div className="space-y-4">
      {!hasData ? (
        <SectionCard>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Este reporte no contiene informacion presupuestaria registrada.
          </p>
        </SectionCard>
      ) : null}

      <BudgetSummaryCards reporte={reporte} includeRegisteredEstimate />
      <BudgetProgressBar value={reporte.ejecucion_presupuestaria ?? 0} />

      <SectionCard title="Interpretacion">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {interpretation || "No existe interpretacion presupuestaria disponible para este reporte."}
        </p>
      </SectionCard>

      <SectionCard title="Detalle por fase">
        <BudgetPhaseTable rows={phaseRows} />
      </SectionCard>

      <SectionCard title="Detalle por tarea">
        <BudgetTaskTable rows={taskRows} />
      </SectionCard>
    </div>
  );
}

