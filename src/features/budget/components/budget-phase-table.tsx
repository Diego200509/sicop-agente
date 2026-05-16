import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import type { BudgetRecord } from "@/src/features/budget/types/budget.types";
import { getDisplayValue, getMoneyValue } from "@/src/features/budget/utils/budget-mappers";

export function BudgetPhaseTable({ rows }: { rows: BudgetRecord[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        No existe detalle presupuestario por fase para este reporte.
      </p>
    );
  }

  return (
    <div className="scrollbar-elegant overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
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
                {getMoneyValue(row, ["costo_estimado", "presupuesto_estimado", "costo_planificado", "estimado"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getMoneyValue(row, ["costo_real", "real", "costo_real_total"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getMoneyValue(row, ["variacion", "variacion_costo", "desviacion"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getDisplayValue(row, ["numero_tareas", "num_tareas", "tareas", "cantidad_tareas", "total_tareas"], "0")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

