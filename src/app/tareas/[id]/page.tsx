"use client";

import { use } from "react";
import {
  Braces,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Code2,
  FileSearch,
  FileText,
  FolderGit2,
  GitPullRequest,
  Layers,
  Link2,
} from "lucide-react";

import { ChatPanel } from "@/src/components/chat/chat-panel";
import { ConclusionCard } from "@/src/components/chat/conclusion-card";
import { AnalysisViewer } from "@/src/components/documentos/analysis-viewer";
import { PdfTextViewer } from "@/src/components/documentos/pdf-text-viewer";
import { AppPageShell } from "@/src/components/layout/app-page-shell";
import { BackButton } from "@/src/components/layout/back-button";
import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { CodigoPrViewer } from "@/src/components/tareas/codigo-pr-viewer";
import { TareaDescripcion } from "@/src/components/tareas/tarea-descripcion";
import { Card } from "@/src/components/ui/card";
import { DetailBlock, DetailBlockRow } from "@/src/components/ui/detail-block";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { useTareaDetalle } from "@/src/hooks/use-tarea-detalle";
import { requiresCodeReviewByPhase } from "@/src/lib/fases";

type TareaDetallePageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(value: string | null): string {
  if (!value) return "No definido";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No definido" : date.toLocaleString("es-ES");
}

export default function TareaDetallePage({ params }: TareaDetallePageProps) {
  const { id } = use(params);
  const { detalle, loading, error } = useTareaDetalle(id);

  if (loading) {
    return (
      <AppPageShell className="gap-4">
        <BackButton href="/tareas" label="Volver a tareas" />
        <Card>
          <p className="text-sm text-zinc-500">Cargando detalle...</p>
        </Card>
      </AppPageShell>
    );
  }

  if (error || !detalle) {
    return (
      <AppPageShell className="gap-4">
        <BackButton href="/tareas" label="Volver a tareas" />
        <Card className="overflow-hidden">
          <EmptyState
            tone="error"
            icon={CircleAlert}
            title="No se pudo cargar la tarea"
            description={
              error ??
              "No se encontró la tarea solicitada o ocurrió un error al obtener el detalle. Vuelve al listado e inténtalo de nuevo."
            }
          />
        </Card>
      </AppPageShell>
    );
  }

  const repo = [detalle.codigo.repo_owner, detalle.codigo.repo_name].filter(Boolean).join("/");
  const codeApplies = requiresCodeReviewByPhase(detalle.fase);
  const estadoOperativo = detalle.completado || detalle.estado === "Cumplida" ? "completo" : "pendiente";
  const estadoOperativoLabel = estadoOperativo === "completo" ? "Cumplida" : "Pendiente";

  return (
    <AppPageShell fillHeight className="gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3">
        <BackButton href="/tareas" label="Volver a tareas" />
        <h2 className="text-2xl font-semibold sm:text-3xl">Detalle de tarea</h2>
      </div>

      <Tabs defaultValue="resumen" className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <TabsList className="shrink-0">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="documental">Documental</TabsTrigger>
          {codeApplies ? <TabsTrigger value="codigo">Código</TabsTrigger> : null}
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <Card className="space-y-5">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{detalle.titulo}</h3>
            <DetailBlockRow
              icon={Layers}
              title="Fase en el tablero"
              hint="Etapa del proyecto a la que pertenece esta tarea."
              tone="violet"
            >
              <FaseBadge fase={detalle.fase} />
            </DetailBlockRow>
            <DetailBlockRow
              icon={CheckCircle2}
              title="Estado de la tarea"
              hint="Estado operativo recibido desde Trello."
              tone={estadoOperativo === "completo" ? "emerald" : "amber"}
            >
              <EstadoBadge estado={estadoOperativo} etiqueta={estadoOperativoLabel} />
            </DetailBlockRow>
            <DetailBlock
              icon={CalendarDays}
              title="Fechas planificadas"
              hint="Inicio y fin registrados para la tarjeta."
              tone="sky"
              dense
            >
              <div className="grid gap-2 rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 text-sm shadow-sm sm:grid-cols-2 dark:border-zinc-700/90 dark:bg-zinc-950/60">
                <div>
                  <span className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Inicio</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{formatDateTime(detalle.inicio)}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Fin</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{formatDateTime(detalle.fin)}</span>
                </div>
              </div>
            </DetailBlock>
            <TareaDescripcion text={detalle.descripcion} />
            <DetailBlock
              icon={Link2}
              title="Enlace de la tarjeta"
              hint="Abre el tablero externo en una nueva pestaña."
              tone="emerald"
            >
              <div className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-zinc-700/90 dark:bg-zinc-950/60">
                {detalle.url_tarjeta ? (
                  <a
                    href={detalle.url_tarjeta}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                  >
                    {detalle.url_tarjeta}
                  </a>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-400">Sin URL registrada.</span>
                )}
              </div>
            </DetailBlock>
            <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <EstadoBadge
                estado={detalle.estado_documental}
                etiqueta={`Documental: ${detalle.estado_documental === "completo" ? "Completo" : "Pendiente"}`}
              />
              {codeApplies ? (
                <EstadoBadge
                  estado={detalle.estado_codigo}
                  etiqueta={`Código: ${detalle.estado_codigo === "completo" ? "Completo" : "Pendiente"}`}
                />
              ) : null}
            </div>

            {codeApplies ? <ConclusionCard idTarea={detalle.id} /> : null}
          </Card>
        </TabsContent>

        <TabsContent value="documental" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Revisión documental</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Material extraído del PDF y el análisis generado para esta tarea.
              </p>
            </div>
            <DetailBlock
              icon={FileText}
              title="Texto del PDF"
              hint="Contenido de texto asociado al documento de la tarjeta."
              tone="amber"
            >
              <PdfTextViewer value={detalle.documental.texto_pdf} />
            </DetailBlock>
            <DetailBlock
              icon={FileSearch}
              title="Análisis documental"
              hint="Observaciones, riesgos y conclusiones del agente sobre el documento."
              tone="sky"
            >
              <AnalysisViewer value={detalle.documental.analisis_documental} />
            </DetailBlock>
          </div>
        </TabsContent>

        <TabsContent
          value="chat"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ChatPanel
            tareaId={detalle.id}
            title={`Chat — ${detalle.titulo}`}
            className="min-h-0 flex-1"
          />
        </TabsContent>

        {codeApplies ? (
          <TabsContent value="codigo" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            <Card className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Revisión de código</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Pull request, diff y análisis automático del cambio en el repositorio.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailBlock
                  icon={GitPullRequest}
                  title="Pull request"
                  hint="Título del PR enlazado a esta tarea."
                  tone="rose"
                  dense
                >
                  <p className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-950/60 dark:text-zinc-100">
                    {detalle.codigo.pr_title ?? "Sin PR registrado"}
                  </p>
                </DetailBlock>
                <DetailBlock
                  icon={FolderGit2}
                  title="Repositorio"
                  hint="Dueño y nombre del repo en GitHub."
                  tone="zinc"
                  dense
                >
                  <p className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 font-mono text-sm font-medium text-zinc-900 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-950/60 dark:text-zinc-100">
                    {repo || "Sin repositorio registrado"}
                  </p>
                </DetailBlock>
              </div>
              <DetailBlock
                icon={Code2}
                title="Diff del PR"
                hint="Fragmentos de código o diff tal como se registraron en la revisión."
                tone="violet"
              >
                <CodigoPrViewer value={detalle.codigo.codigo_pr} />
              </DetailBlock>
              <DetailBlock
                icon={Braces}
                title="Análisis de código"
                hint="Comentarios del agente sobre calidad, riesgos y alineación con la tarea."
                tone="sky"
              >
                <AnalysisViewer
                  value={detalle.codigo.analisis_codigo}
                  emptyLabel="Sin análisis de código registrado"
                />
              </DetailBlock>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </AppPageShell>
  );
}
