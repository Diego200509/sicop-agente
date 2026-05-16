import { Eye } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import type { BudgetReport } from "@/src/features/budget/types/budget.types";
import {
  formatBudgetDate,
  formatCurrency,
  formatPercent,
  getBudgetStatusLabel,
} from "@/src/features/budget/utils/budget-formatters";

type BudgetHistoryTableProps = {
  reportes: BudgetReport[];
  selectedReporteId: string;
  onSelect: (id: string) => void;
};

export function BudgetHistoryTable({ reportes, selectedReporteId, onSelect }: BudgetHistoryTableProps) {
  return (
    <div className="scrollbar-elegant overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-100/80 hover:bg-zinc-100/80 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Presupuesto total</TableHead>
            <TableHead className="text-right">Costo real</TableHead>
            <TableHead className="text-right">Variacion</TableHead>
            <TableHead className="text-right">Ejecucion</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Accion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportes.map((reporte) => (
            <TableRow key={reporte.id} className={selectedReporteId === reporte.id ? "bg-sky-50/70 dark:bg-sky-950/20" : undefined}>
              <TableCell className="whitespace-nowrap">{formatBudgetDate(reporte.fecha_revision)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(reporte.presupuesto_total ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(reporte.costo_real_total ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(reporte.variacion_costo ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPercent(reporte.ejecucion_presupuestaria ?? 0)}%</TableCell>
              <TableCell>{getBudgetStatusLabel(reporte.estado_presupuesto)}</TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => onSelect(reporte.id)}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Eye className="size-4" aria-hidden />
                  Ver
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

