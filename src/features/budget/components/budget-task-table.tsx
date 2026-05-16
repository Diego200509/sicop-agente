import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import type { BudgetRecord } from "@/src/features/budget/types/budget.types";
import { getDisplayValue, getMoneyValue } from "@/src/features/budget/utils/budget-mappers";

export function BudgetTaskTable({ rows }: { rows: BudgetRecord[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        No existe detalle presupuestario por tarea para este reporte.
      </p>
    );
  }

  return (
    <div className="scrollbar-elegant overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-100/80 hover:bg-zinc-100/80 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
            <TableHead>Tarea</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Costo estimado</TableHead>
            <TableHead className="text-right">Costo real</TableHead>
            <TableHead className="text-right">Horas estimadas</TableHead>
            <TableHead className="text-right">Horas trabajadas</TableHead>
            <TableHead className="text-right">Tarifa hora</TableHead>
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
              <TableCell>
                <TaskStatusBadge row={row} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getMoneyValue(row, ["costo_estimado", "presupuesto_estimado", "estimado"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getMoneyValue(row, ["costo_real", "real"])}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getDisplayValue(row, ["horas_estimadas", "horas_planificadas", "estimacion_horas"], "0")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getDisplayValue(row, ["horas_trabajadas", "horas_reales", "horas"], "0")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {getMoneyValue(row, ["tarifa_hora", "tarifa", "costo_hora"])}
              </TableCell>
              <TableCell className="min-w-[12rem]">
                {getDisplayValue(row, ["recurso_responsable", "responsable", "recurso", "asignado_a"], "Sin responsable")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TaskStatusBadge({ row }: { row: BudgetRecord }) {
  const status = getTaskStatus(row);
  const normalizedStatus = status.trim().toLowerCase();
  const variant =
    normalizedStatus === "completada" || normalizedStatus === "cumplida"
      ? "success"
      : normalizedStatus === "no definido"
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant} className="w-fit capitalize">
      {status}
    </Badge>
  );
}

function getTaskStatus(row: BudgetRecord): string {
  const estadoSeguimiento = getStringValue(row.estado_seguimiento);
  if (estadoSeguimiento) return estadoSeguimiento;

  const estado = getStringValue(row.estado);
  if (estado) return estado;

  if (row.completada === true) return "Completada";

  return "No definido";
}

function getStringValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.trim();
  return text ? text : null;
}
