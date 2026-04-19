"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, ClipboardList, GripVertical } from "lucide-react";
import { useCallback, useMemo } from "react";

import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { MotionLink } from "@/src/components/ui/motion-press";
import { cn } from "@/src/lib/utils";
import { FASES_TABLERO, normalizePhase } from "@/src/lib/fases";
import {
  replaceColumnTasksInFlatTareas,
  sortTareasInPhase,
  withSequentialOrden,
} from "@/src/lib/tareas-order";

import type { TareaTablaItem } from "@/src/components/tareas/tareas-table";

type ColumnModel = {
  id: string;
  titulo: string;
  tareas: TareaTablaItem[];
  sortable: boolean;
};

function buildColumns(tareas: TareaTablaItem[]): ColumnModel[] {
  const map = new Map<string, TareaTablaItem[]>();
  for (const f of FASES_TABLERO) {
    map.set(f.key, []);
  }
  const otras: TareaTablaItem[] = [];

  for (const t of tareas) {
    const k = normalizePhase(t.fase);
    const known = FASES_TABLERO.some((f) => f.key === k);
    if (known) {
      map.get(k)!.push(t);
    } else {
      otras.push(t);
    }
  }

  const cols: ColumnModel[] = FASES_TABLERO.map((f) => ({
    id: f.key,
    titulo: f.titulo,
    tareas: sortTareasInPhase(map.get(f.key) ?? []),
    sortable: true,
  }));

  if (otras.length > 0) {
    cols.push({
      id: "__otras__",
      titulo: "Otras fases",
      tareas: sortTareasInPhase(otras),
      sortable: false,
    });
  }

  return cols;
}

function findColumnForTaskId(columns: ColumnModel[], taskId: string): ColumnModel | null {
  for (const col of columns) {
    if (col.tareas.some((t) => t.id === taskId)) return col;
  }
  return null;
}

async function persistReorder(faseColumnKey: string, items: Array<{ id: string; orden: number }>): Promise<void> {
  const res = await fetch("/api/reordenar-tareas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faseColumnKey, items }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

function StaticTareaCard({ tarea }: { tarea: TareaTablaItem }) {
  const fechaLabel = tarea.fecha_ultima_revision
    ? new Date(tarea.fecha_ultima_revision).toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <MotionLink
      href={`/tareas/${tarea.id}`}
      wrapperClassName="w-full min-w-0"
      className={cn(
        "block w-full min-w-0 rounded-lg border border-zinc-200/80 bg-white p-3 text-left shadow-sm transition-colors",
        "hover:border-zinc-300 hover:bg-zinc-50",
        "dark:border-zinc-700/90 dark:bg-zinc-900/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/80",
      )}
    >
      <p className="line-clamp-3 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{tarea.titulo}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <EstadoBadge
          estado={tarea.estado_documental}
          etiqueta={tarea.estado_documental === "completo" ? "Doc" : "Doc pend."}
        />
        <EstadoBadge
          estado={tarea.estado_codigo}
          etiqueta={
            tarea.estado_codigo === "completo"
              ? "Código"
              : tarea.estado_codigo === "no_aplica"
                ? "Cód. n/a"
                : "Cód pend."
          }
        />
      </div>
      {fechaLabel ? (
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <CalendarClock className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
          <span className="min-w-0 leading-snug">
            <span className="text-zinc-500 dark:text-zinc-500">Última revisión: </span>
            {fechaLabel}
          </span>
        </div>
      ) : (
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <CalendarClock className="size-3.5 shrink-0 opacity-50" aria-hidden />
          <span>Sin revisiones</span>
        </div>
      )}
    </MotionLink>
  );
}

function SortableTareaCard({ tarea }: { tarea: TareaTablaItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fechaLabel = tarea.fecha_ultima_revision
    ? new Date(tarea.fecha_ultima_revision).toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full min-w-0 gap-1.5 rounded-lg border border-zinc-200/80 bg-white p-2 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/80",
        isDragging && "z-10 opacity-90 ring-2 ring-zinc-400/50 dark:ring-zinc-500/50",
      )}
    >
      <button
        type="button"
        className={cn(
          "mt-0.5 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-transparent",
          "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing",
          "dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
        )}
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1 py-0.5">
        <MotionLink
          href={`/tareas/${tarea.id}`}
          wrapperClassName="block w-full min-w-0"
          className={cn(
            "block w-full min-w-0 rounded-md text-left transition-colors",
            "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
          )}
        >
          <p className="line-clamp-3 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{tarea.titulo}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <EstadoBadge
              estado={tarea.estado_documental}
              etiqueta={tarea.estado_documental === "completo" ? "Doc" : "Doc pend."}
            />
            <EstadoBadge
              estado={tarea.estado_codigo}
              etiqueta={
                tarea.estado_codigo === "completo"
                  ? "Código"
                  : tarea.estado_codigo === "no_aplica"
                    ? "Cód. n/a"
                    : "Cód pend."
              }
            />
          </div>
          {fechaLabel ? (
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <CalendarClock className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
              <span className="min-w-0 leading-snug">
                <span className="text-zinc-500 dark:text-zinc-500">Última revisión: </span>
                {fechaLabel}
              </span>
            </div>
          ) : (
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <CalendarClock className="size-3.5 shrink-0 opacity-50" aria-hidden />
              <span>Sin revisiones</span>
            </div>
          )}
        </MotionLink>
      </div>
    </div>
  );
}

type TareasBoardProps = {
  tareas: TareaTablaItem[];
  onTareasChange: (next: TareaTablaItem[]) => void;
};

export function TareasBoard({ tareas, onTareasChange }: TareasBoardProps) {
  const columns = useMemo(() => buildColumns(tareas), [tareas]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeCol = findColumnForTaskId(columns, activeId);
      const overCol = findColumnForTaskId(columns, overId);
      if (!activeCol || !overCol || activeCol.id !== overCol.id) return;
      if (!activeCol.sortable) return;

      const list = activeCol.tareas;
      const oldIndex = list.findIndex((t) => t.id === activeId);
      const newIndex = list.findIndex((t) => t.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = withSequentialOrden(arrayMove(list, oldIndex, newIndex));
      const previous = tareas;
      const nextFlat = replaceColumnTasksInFlatTareas(tareas, activeCol.id, reordered);
      onTareasChange(nextFlat);

      const payload = reordered.map((t, i) => ({ id: t.id, orden: i + 1 }));
      void persistReorder(activeCol.id, payload).catch((err) => {
        console.error("Reordenar tareas:", err);
        onTareasChange(previous);
      });
    },
    [columns, onTareasChange, tareas],
  );

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden",
        "min-h-[min(28rem,calc(100dvh-14rem))] max-h-[calc(100dvh-14rem)]",
      )}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div
          className={cn(
            "scrollbar-elegant flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4",
            "snap-x snap-mandatory sm:snap-none",
          )}
        >
          {columns.map((col) => (
            <section
              key={col.id}
              className={cn(
                "flex h-full min-h-0 w-[min(100%,18rem)] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80 sm:w-[min(100%,20rem)]",
                "dark:border-zinc-800 dark:bg-zinc-900/50",
              )}
              aria-label={`Columna ${col.titulo}`}
            >
              <header className="shrink-0 border-b border-zinc-200/90 px-3 py-2.5 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{col.titulo}</h3>
                  <span className="shrink-0 rounded-md bg-zinc-200/80 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {col.tareas.length}
                  </span>
                </div>
              </header>
              <div className="scrollbar-elegant flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {col.tareas.length === 0 ? (
                  <EmptyState
                    compact
                    icon={ClipboardList}
                    title="Sin tareas"
                    description="Ninguna tarea en esta fase por ahora."
                  />
                ) : col.sortable ? (
                  <SortableContext items={col.tareas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {col.tareas.map((t) => (
                      <SortableTareaCard key={t.id} tarea={t} />
                    ))}
                  </SortableContext>
                ) : (
                  col.tareas.map((t) => <StaticTareaCard key={t.id} tarea={t} />)
                )}
              </div>
            </section>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
