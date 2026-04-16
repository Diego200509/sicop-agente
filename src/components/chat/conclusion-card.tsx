"use client";

import { useState } from "react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import type { ConclusionResult } from "@/src/types/chat";

type ConclusionCardProps = {
  idTarea: string;
};

export function ConclusionCard({ idTarea }: ConclusionCardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConclusionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tareas/${encodeURIComponent(idTarea)}/conclusion`, {
        method: "POST",
      });
      const json = (await res.json()) as { data?: ConclusionResult; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo generar la conclusion");
      setData(json.data ?? null);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Conclusion comparativa</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Compara la revision documental y la de codigo mas recientes de esta tarea.
          </p>
        </div>
        <Button type="button" variant="default" disabled={loading} onClick={() => void generate()}>
          {loading ? "Generando..." : "Generar conclusion"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p>
            <span className="font-semibold">Nivel de cumplimiento:</span> {data.nivel_cumplimiento}
          </p>
          <p>
            <span className="font-semibold">Coincidencias:</span> {data.coincidencias}
          </p>
          <p>
            <span className="font-semibold">Diferencias:</span> {data.diferencias}
          </p>
          <p>
            <span className="font-semibold">Riesgos u observaciones:</span> {data.riesgos_observaciones}
          </p>
          <p>
            <span className="font-semibold">Recomendacion final:</span> {data.recomendacion_final}
          </p>
        </div>
      )}
    </Card>
  );
}
