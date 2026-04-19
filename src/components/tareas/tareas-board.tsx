"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDndMonitor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { ClipboardList, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { MotionLink, usePressMotion } from "@/src/components/ui/motion-press";
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

/** Línea superior de color por fase (tablero). */
function columnTopBorderClass(columnId: string): string {
  if (columnId === "__otras__") return "border-t-zinc-500";
  const k = normalizePhase(columnId);
  const map: Record<string, string> = {
    planificacion: "border-t-sky-500",
    "analisis de requerimientos": "border-t-violet-500",
    diseno: "border-t-fuchsia-500",
    desarrollo: "border-t-emerald-500",
    "seguimiento y control": "border-t-amber-400",
    cierre: "border-t-zinc-500",
  };
  return map[k] ?? "border-t-zinc-500";
}

/** Solo sombra al hover: el scale hacía solaparse las tarjetas en columnas con scroll. */
const cardHoverMotion =
  "transition-[box-shadow,colors,border-color] duration-200 ease-out hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/35";

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
      wrapperClassName="w-full min-w-0 shrink-0"
      className={cn(
        "block w-full min-w-0 shrink-0 rounded-xl border border-zinc-200/85 bg-white p-3.5 text-left shadow-sm",
        "hover:border-zinc-300/95 hover:bg-zinc-50/90",
        "dark:border-zinc-700/90 dark:bg-zinc-900/85 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/90",
        cardHoverMotion,
      )}
    >
      <p className="line-clamp-3 text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
        {tarea.titulo}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <EstadoBadge
          estado={tarea.estado_documental}
          evidence="documental"
          etiqueta={tarea.estado_documental === "completo" ? "Doc" : "Doc pend."}
        />
        <EstadoBadge
          estado={tarea.estado_codigo}
          evidence="codigo"
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
        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-2.5 text-[11px] dark:border-zinc-800/80">
          <Clock className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
          <span className="min-w-0 leading-snug text-zinc-600 dark:text-zinc-300">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Última revisión
            </span>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
            <span className="tabular-nums text-zinc-700 dark:text-zinc-200">{fechaLabel}</span>
          </span>
        </div>
      ) : (
        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
          <Clock className="size-3.5 shrink-0 opacity-50" aria-hidden />
          <span>Sin revisiones</span>
        </div>
      )}
    </MotionLink>
  );
}

function SortableTareaCard({
  tarea,
  flash,
}: {
  tarea: TareaTablaItem;
  flash: { id: string; key: number } | null;
}) {
  const router = useRouter();
  const press = usePressMotion();
  const skipClickAfterDragRef = useRef(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSkipNextClick = useCallback(() => {
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipClickAfterDragRef.current = true;
    skipTimerRef.current = setTimeout(() => {
      skipClickAfterDragRef.current = false;
      skipTimerRef.current = null;
    }, 120);
  }, []);

  useDndMonitor({
    onDragEnd({ active }) {
      if (String(active.id) === tarea.id) markSkipNextClick();
    },
    onDragCancel({ active }) {
      if (String(active.id) === tarea.id) markSkipNextClick();
    },
  });

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

  const openDetalle = useCallback(() => {
    router.push(`/tareas/${tarea.id}`);
  }, [router, tarea.id]);

  const showFlash = flash?.id === tarea.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-full min-w-0 shrink-0 select-none overflow-hidden rounded-xl border border-zinc-200/85 bg-white p-3.5 text-left shadow-sm outline-none",
        "hover:border-zinc-300/95 hover:bg-zinc-50/90",
        "dark:border-zinc-700/90 dark:bg-zinc-900/85 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/90",
        !isDragging && cardHoverMotion,
        "cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-950",
        isDragging && "z-10 cursor-grabbing opacity-90 ring-2 ring-zinc-400/50 dark:ring-zinc-500/50",
      )}
      {...attributes}
      {...listeners}
      title="Clic para abrir la tarea; mantén pulsado un momento para moverla en la columna"
      aria-label="Clic para abrir la tarea; mantén pulsado para reordenar en la columna"
      onClick={() => {
        if (skipClickAfterDragRef.current) {
          skipClickAfterDragRef.current = false;
          return;
        }
        openDetalle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openDetalle();
        }
      }}
    >
      {showFlash ? (
        <motion.div
          key={flash.key}
          className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-emerald-400/35 dark:bg-emerald-400/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.42, times: [0, 0.22, 1], ease: "easeInOut" }}
          aria-hidden
        />
      ) : null}
      <motion.span {...press} tabIndex={-1} className="relative z-0 block w-full min-w-0">
        <p className="line-clamp-3 text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
          {tarea.titulo}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <EstadoBadge
            estado={tarea.estado_documental}
            evidence="documental"
            etiqueta={tarea.estado_documental === "completo" ? "Doc" : "Doc pend."}
          />
          <EstadoBadge
            estado={tarea.estado_codigo}
            evidence="codigo"
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
          <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-2.5 text-[11px] dark:border-zinc-800/80">
            <Clock className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
            <span className="min-w-0 leading-snug text-zinc-600 dark:text-zinc-300">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Última revisión
              </span>
              <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
              <span className="tabular-nums text-zinc-700 dark:text-zinc-200">{fechaLabel}</span>
            </span>
          </div>
        ) : (
          <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            <Clock className="size-3.5 shrink-0 opacity-50" aria-hidden />
            <span>Sin revisiones</span>
          </div>
        )}
      </motion.span>
    </div>
  );
}

type TareasBoardProps = {
  tareas: TareaTablaItem[];
  onTareasChange: (next: TareaTablaItem[]) => void;
};

export function TareasBoard({ tareas, onTareasChange }: TareasBoardProps) {
  const columns = useMemo(() => buildColumns(tareas), [tareas]);
  const [persistFlash, setPersistFlash] = useState<{ id: string; key: number } | null>(null);
  const flashKeyRef = useRef(0);

  const triggerPersistFlash = useCallback((taskId: string) => {
    flashKeyRef.current += 1;
    setPersistFlash({ id: taskId, key: flashKeyRef.current });
  }, []);

  useEffect(() => {
    if (!persistFlash) return;
    const t = window.setTimeout(() => setPersistFlash(null), 480);
    return () => window.clearTimeout(t);
  }, [persistFlash]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 260, tolerance: 8 },
    }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 10 } }),
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
      void persistReorder(activeCol.id, payload)
        .then(() => {
          triggerPersistFlash(activeId);
        })
        .catch((err) => {
          console.error("Reordenar tareas:", err);
          onTareasChange(previous);
        });
    },
    [columns, onTareasChange, tareas, triggerPersistFlash],
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
            "scrollbar-elegant flex min-h-0 min-w-0 flex-1 flex-nowrap gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 sm:gap-4",
            "snap-x snap-mandatory sm:snap-none",
          )}
        >
          {columns.map((col) => (
            <section
              key={col.id}
              className={cn(
                "flex h-full min-h-0 w-[min(100%,18rem)] shrink-0 snap-center flex-col overflow-hidden rounded-xl border-b border-l border-r border-zinc-200 border-t-4 bg-zinc-100/90 sm:w-[min(100%,20rem)]",
                "dark:border-b-zinc-800 dark:border-l-zinc-800 dark:border-r-zinc-800 dark:bg-zinc-900/65",
                columnTopBorderClass(col.id),
              )}
              aria-label={`Columna ${col.titulo}`}
            >
              <header className="shrink-0 border-b border-zinc-200/90 bg-white/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {col.titulo}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300/90 bg-zinc-900 px-2.5 text-xs font-bold tabular-nums text-white shadow-sm",
                      "dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900",
                    )}
                    aria-label={`${col.tareas.length} tareas`}
                  >
                    {col.tareas.length}
                  </span>
                </div>
              </header>
              <div className="scrollbar-elegant flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2">
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
                      <SortableTareaCard key={t.id} tarea={t} flash={persistFlash} />
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
