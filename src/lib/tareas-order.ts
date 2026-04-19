import type { TareaTablaItem } from "@/src/components/tareas/tareas-table";
import { FASES_TABLERO, normalizePhase } from "@/src/lib/fases";

/** Orden dentro de una misma fase: `orden` ascendente; `null` al final; empate por `created_at`. */
export function compareTareaOrder(a: TareaTablaItem, b: TareaTablaItem): number {
  const ao = a.orden;
  const bo = b.orden;
  if (ao != null && bo != null && ao !== bo) return ao - bo;
  if (ao != null && bo == null) return -1;
  if (ao == null && bo != null) return 1;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function sortTareasInPhase(items: TareaTablaItem[]): TareaTablaItem[] {
  return [...items].sort(compareTareaOrder);
}

/** Asigna `orden` 1..n según el orden del array (misma fase). */
export function withSequentialOrden(tareas: TareaTablaItem[]): TareaTablaItem[] {
  return tareas.map((t, index) => ({ ...t, orden: index + 1 }));
}

export type ReordenarItemPayload = { id: string; orden: number };

/** Reemplaza en el listado plano las tareas que pertenecen a la columna `columnId` (clave de fase normalizada o `__otras__`). */
export function replaceColumnTasksInFlatTareas(
  flat: TareaTablaItem[],
  columnId: string,
  newColumnTasks: TareaTablaItem[],
): TareaTablaItem[] {
  const inColumn = (t: TareaTablaItem) => {
    const k = normalizePhase(t.fase);
    if (columnId === "__otras__") {
      return !FASES_TABLERO.some((f) => f.key === k);
    }
    return k === columnId;
  };
  const rest = flat.filter((t) => !inColumn(t));
  return [...rest, ...newColumnTasks];
}
