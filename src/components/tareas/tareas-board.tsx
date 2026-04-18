import { CalendarClock } from "lucide-react";

import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { MotionLink } from "@/src/components/ui/motion-press";
import { cn } from "@/src/lib/utils";
import { FASES_TABLERO, normalizePhase } from "@/src/lib/fases";

import type { TareaTablaItem } from "@/src/components/tareas/tareas-table";

type ColumnModel = {
  id: string;
  titulo: string;
  tareas: TareaTablaItem[];
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
    tareas: map.get(f.key) ?? [],
  }));

  if (otras.length > 0) {
    cols.push({
      id: "__otras__",
      titulo: "Otras fases",
      tareas: otras,
    });
  }

  return cols;
}

function TareaCard({ tarea }: { tarea: TareaTablaItem }) {
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
            tarea.estado_codigo === "completo" ? "Código" : tarea.estado_codigo === "no_aplica" ? "Cód. n/a" : "Cód pend."
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

type TareasBoardProps = {
  tareas: TareaTablaItem[];
};

export function TareasBoard({ tareas }: TareasBoardProps) {
  const columns = buildColumns(tareas);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden",
        "min-h-[min(28rem,calc(100dvh-14rem))] max-h-[calc(100dvh-14rem)]",
      )}
    >
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
            <div className="scrollbar-elegant flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 [&>*]:w-full">
              {col.tareas.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-zinc-500 dark:text-zinc-500">Sin tareas</p>
              ) : (
                col.tareas.map((t) => <TareaCard key={t.id} tarea={t} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
