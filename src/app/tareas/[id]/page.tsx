"use client";

import { use } from "react";

import { ChatPanel } from "@/src/components/chat/chat-panel";
import { ConclusionCard } from "@/src/components/chat/conclusion-card";
import { AnalysisViewer } from "@/src/components/documentos/analysis-viewer";
import { PdfTextViewer } from "@/src/components/documentos/pdf-text-viewer";
import { BackButton } from "@/src/components/layout/back-button";
import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { Card } from "@/src/components/ui/card";
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
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <BackButton href="/tareas" label="Volver a tareas" />
        <Card>
          <p className="text-sm text-zinc-500">Cargando detalle...</p>
        </Card>
      </section>
    );
  }

  if (error || !detalle) {
    return (
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <BackButton href="/tareas" label="Volver a tareas" />
        <Card>
          <p className="text-sm text-rose-600">{error ?? "No se encontro la tarea solicitada"}</p>
        </Card>
      </section>
    );
  }

  const repo = [detalle.codigo.repo_owner, detalle.codigo.repo_name].filter(Boolean).join("/");
  const codeApplies = requiresCodeReviewByPhase(detalle.fase);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 min-h-0 overflow-hidden">
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
            <p className="text-sm text-zinc-700 dark:text-zinc-200">{detalle.descripcion}</p>
            <p className="text-sm">
              URL tarjeta:{" "}
              {detalle.url_tarjeta ? (
                <a href={detalle.url_tarjeta} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {detalle.url_tarjeta}
                </a>
              ) : (
                "Sin URL"
              )}
            </p>
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

            {codeApplies ? <ConclusionCard idTarea={detalle.id_tarea} /> : null}
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
                <p className="text-sm font-medium">Codigo PR</p>
                <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {detalle.codigo.codigo_pr ?? "Sin codigo PR registrado"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Analisis codigo</p>
                <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {detalle.codigo.analisis_codigo ?? "Sin analisis de codigo registrado"}
                </p>
              </div>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}
