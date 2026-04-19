"use client";

import { use } from "react";
import { CircleAlert } from "lucide-react";

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
import { EmptyState } from "@/src/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { useTareaDetalle } from "@/src/hooks/use-tarea-detalle";
import { requiresCodeReviewByPhase } from "@/src/lib/fases";

type TareaDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default function TareaDetallePage({ params }: TareaDetallePageProps) {
  const { id } = use(params);
  const { detalle, loading, error } = useTareaDetalle(id);

  if (loading) {
    return (
      <AppPageShell maxWidth="2xl" className="gap-4">
        <BackButton href="/tareas" label="Volver a tareas" />
        <Card>
          <p className="text-sm text-zinc-500">Cargando detalle...</p>
        </Card>
      </AppPageShell>
    );
  }

  if (error || !detalle) {
    return (
      <AppPageShell maxWidth="2xl" className="gap-4">
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

  return (
    <AppPageShell maxWidth="2xl" fillHeight className="gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3">
        <BackButton href="/tareas" label="Volver a tareas" />
        <h2 className="text-2xl font-semibold sm:text-3xl">Detalle de tarea</h2>
      </div>

      <Tabs defaultValue="resumen" className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <TabsList className="shrink-0">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="documental">Documental</TabsTrigger>
          {codeApplies ? <TabsTrigger value="codigo">Codigo</TabsTrigger> : null}
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <Card className="space-y-3">
            <h3 className="text-xl font-semibold">{detalle.titulo}</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span>Fase:</span>
              <FaseBadge fase={detalle.fase} />
            </div>
            <TareaDescripcion text={detalle.descripcion} />
            <div className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-700">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">URL tarjeta</span>
              <span className="mx-2 text-zinc-400">·</span>
              {detalle.url_tarjeta ? (
                <a
                  href={detalle.url_tarjeta}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {detalle.url_tarjeta}
                </a>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">Sin URL</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <EstadoBadge
                estado={detalle.estado_documental}
                etiqueta={`Documental: ${detalle.estado_documental === "completo" ? "Completo" : "Pendiente"}`}
              />
              {codeApplies ? (
                <EstadoBadge
                  estado={detalle.estado_codigo}
                  etiqueta={`Codigo: ${detalle.estado_codigo === "completo" ? "Completo" : "Pendiente"}`}
                />
              ) : null}
            </div>

            {codeApplies ? <ConclusionCard idTarea={detalle.id} /> : null}
          </Card>
        </TabsContent>

        <TabsContent value="documental" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Revision documental</h3>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Texto PDF</p>
              <PdfTextViewer value={detalle.documental.texto_pdf} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Analisis documental</p>
              <AnalysisViewer value={detalle.documental.analisis_documental} />
            </div>
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
            <Card className="space-y-3">
              <h3 className="text-lg font-semibold">Revision de codigo</h3>
              <p className="text-sm">
                PR: <span className="font-medium">{detalle.codigo.pr_title ?? "Sin PR registrado"}</span>
              </p>
              <p className="text-sm">
                Repo: <span className="font-medium">{repo || "Sin repositorio registrado"}</span>
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Codigo PR</p>
                <CodigoPrViewer value={detalle.codigo.codigo_pr} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Analisis codigo</p>
                <AnalysisViewer
                  value={detalle.codigo.analisis_codigo}
                  emptyLabel="Sin analisis de codigo registrado"
                />
              </div>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </AppPageShell>
  );
}
