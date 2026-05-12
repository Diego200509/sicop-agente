"use client";

import { useEffect, useMemo, useState } from "react";

type TareaDetalle = {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta: string | null;
  inicio: string | null;
  fin: string | null;
  completado: boolean;
  estado: string;
  estado_documental: "completo" | "pendiente";
  estado_codigo: "completo" | "pendiente" | "no_aplica";
  documental: {
    texto_pdf: string | null;
    analisis_documental: string | null;
  };
  codigo: {
    pr_title: string | null;
    repo_owner: string | null;
    repo_name: string | null;
    codigo_pr: string | null;
    analisis_codigo: string | null;
  };
};

type UseTareaDetalleResult = {
  detalle: TareaDetalle | null;
  loading: boolean;
  error: string | null;
};

export function useTareaDetalle(id: string): UseTareaDetalleResult {
  const [detalle, setDetalle] = useState<TareaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/tareas/${id}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) throw new Error("No se pudo cargar el detalle");
        const json = (await response.json()) as { data: TareaDetalle };
        setDetalle(json.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (id) void run();
    return () => controller.abort();
  }, [id]);

  return useMemo(
    () => ({
      detalle,
      loading,
      error,
    }),
    [detalle, loading, error],
  );
}
