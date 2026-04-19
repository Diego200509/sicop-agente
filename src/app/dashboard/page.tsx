import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Code2,
  FileText,
  History,
  ListTodo,
  Tag,
} from "lucide-react";

import { AppPageShell } from "@/src/components/layout/app-page-shell";
import { RevisionCard } from "@/src/components/revisiones/revision-card";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { FormattedDate } from "@/src/components/ui/formatted-date";
import { LinkPill } from "@/src/components/ui/link-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { cn } from "@/src/lib/utils";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import { TareaRepository } from "@/src/repositories/tarea.repository";

async function getDashboardData() {
  try {
    const repository = new TareaRepository(getSupabaseClient());
    return await repository.getDashboardData();
  } catch (error) {
    console.error("getDashboardData:", error);
    return {
      total_tareas: 0,
      total_revisiones_documentales: 0,
      total_revisiones_codigo: 0,
      ultimas_revisiones: [],
    };
  }
}

const statTones = {
  emerald: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  sky: "bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
  violet:
    "bg-violet-500/12 text-violet-700 ring-violet-500/25 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
} as const;

function DashboardStatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof statTones;
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow duration-200 hover:shadow-md dark:hover:shadow-zinc-950/40">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-[0.07] transition-opacity group-hover:opacity-[0.11]",
          tone === "emerald" && "bg-emerald-500",
          tone === "sky" && "bg-sky-500",
          tone === "violet" && "bg-violet-500",
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
        </div>
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset backdrop-blur-sm",
            statTones[tone],
          )}
        >
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <AppPageShell title="Dashboard" className="gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard label="Total tareas" value={dashboard.total_tareas} icon={ListTodo} tone="emerald" />
        <DashboardStatCard
          label="Revisiones documentales"
          value={dashboard.total_revisiones_documentales}
          icon={FileText}
          tone="sky"
        />
        <DashboardStatCard
          label="Revisiones de código"
          value={dashboard.total_revisiones_codigo}
          icon={Code2}
          tone="violet"
        />
      </div>

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
              <History className="size-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Últimas revisiones</h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Actividad reciente en tareas del proyecto
              </p>
            </div>
          </div>
        </div>
        {dashboard.ultimas_revisiones.length === 0 ? (
          <EmptyState
            icon={History}
            title="No hay revisiones aún"
            description="Cuando se registren revisiones documentales o de código en las tareas, verás el listado y enlaces al detalle aquí."
          />
        ) : (
          <>
            <div className="scrollbar-elegant overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-950/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-100/80 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
                    <TableHead>
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="size-3.5 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        Tarea
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-2">
                        <Tag className="size-3.5 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        Fase
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-2">
                        <FileText className="size-3.5 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        Tipo
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="size-3.5 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        Fecha
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center justify-end gap-2">
                        Acción
                        <ChevronRight className="size-3.5 text-zinc-400 opacity-70 dark:text-zinc-500" aria-hidden />
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.ultimas_revisiones.map((revision) => (
                    <TableRow key={revision.id} className="bg-white/80 dark:bg-zinc-900/40">
                      <TableCell className="max-w-[min(100%,18rem)] font-medium text-zinc-900 dark:text-zinc-100">
                        {revision.titulo_tarea}
                      </TableCell>
                      <TableCell>
                        <FaseBadge fase={revision.fase_tarea} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={revision.tipo_revision === "documental" ? "secondary" : "default"}
                          className={cn(
                            "gap-1 capitalize",
                            revision.tipo_revision === "codigo" &&
                              "border border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
                          )}
                        >
                          {revision.tipo_revision === "documental" ? (
                            <FileText className="size-3.5 opacity-90" aria-hidden />
                          ) : (
                            <Code2 className="size-3.5 opacity-90" aria-hidden />
                          )}
                          {revision.tipo_revision}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        <FormattedDate value={revision.fecha_revision} />
                      </TableCell>
                      <TableCell className="text-right">
                        {revision.tarea_uuid ? (
                          <LinkPill
                            href={`/tareas/${encodeURIComponent(revision.tarea_uuid)}`}
                            size="sm"
                            variant="default"
                            wrapperClassName="inline-flex justify-end"
                          >
                            Ver detalle
                          </LinkPill>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Vista previa
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {dashboard.ultimas_revisiones.slice(0, 4).map((revision) => (
                  <RevisionCard
                    key={`card-${revision.id}`}
                    tipo={revision.tipo_revision}
                    titulo={revision.titulo_tarea}
                    fase={revision.fase_tarea}
                    fecha={revision.fecha_revision}
                    descripcion={revision.descripcion || "Sin analisis registrado"}
                    detalleHref={
                      revision.tarea_uuid ? `/tareas/${encodeURIComponent(revision.tarea_uuid)}` : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </Card>
    </AppPageShell>
  );
}
