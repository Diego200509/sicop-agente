import type { BudgetReport } from "@/src/features/budget/types/budget.types";
import { formatBudgetDate, getBudgetStatusLabel } from "@/src/features/budget/utils/budget-formatters";

type BudgetReportSelectorProps = {
  reportes: BudgetReport[];
  selectedReporteId: string;
  onChange: (id: string) => void;
};

export function BudgetReportSelector({ reportes, selectedReporteId, onChange }: BudgetReportSelectorProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Reporte presupuestario</span>
      <select
        value={selectedReporteId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {reportes.map((reporte) => (
          <option key={reporte.id} value={reporte.id}>
            {formatBudgetDate(reporte.fecha_revision)} - {reporte.titulo} - {getBudgetStatusLabel(reporte.estado_presupuesto)}
          </option>
        ))}
      </select>
    </label>
  );
}

