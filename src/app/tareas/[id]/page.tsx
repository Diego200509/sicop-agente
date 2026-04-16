"use client";

import { use } from "react";

import { ChatPanel } from "@/src/components/chat/chat-panel";
import { ConclusionCard } from "@/src/components/chat/conclusion-card";
import { BackButton } from "@/src/components/layout/back-button";
import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { Card } from "@/src/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { useTareaDetalle } from "@/src/hooks/use-tarea-detalle";

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

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-col gap-3">
        <BackButton href="/tareas" label="Volver a tareas" />
        <h2 className="text-2xl font-semibold sm:text-3xl">Detalle de tarea</h2>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="documental">Documental</TabsTrigger>
          <TabsTrigger value="codigo">Codigo</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <Card className="space-y-3">
            <h3 className="text-xl font-semibold">{detalle.titulo}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Fase: {detalle.fase}</p>
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
              <EstadoBadge
                estado={detalle.estado_codigo}
                etiqueta={`Codigo: ${detalle.estado_codigo === "completo" ? "Completo" : "Pendiente"}`}
              />
            </div>

            <ConclusionCard idTarea={detalle.id_tarea} />
          </Card>
        </TabsContent>

        <TabsContent value="documental">
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold">Revision documental</h3>
            <div className="space-y-2">
              <p className="text-sm font-medium">Texto PDF</p>
              <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {detalle.documental.texto_pdf ?? "Sin texto PDF registrado"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Analisis documental</p>
              <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {detalle.documental.analisis_documental ?? "Sin analisis documental registrado"}
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <ChatPanel tareaId={detalle.id} title={`Chat — ${detalle.titulo}`} />
        </TabsContent>

        <TabsContent value="codigo">
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
      </Tabs>
    </section>
  );
}
