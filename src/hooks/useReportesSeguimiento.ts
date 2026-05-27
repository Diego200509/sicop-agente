"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ReporteSeguimiento,
  ReporteSeguimientoEstado,
} from "@/src/types/reporte-seguimiento";

type EstadoFiltro = "todos" | ReporteSeguimientoEstado;

type ReportesResumen = {
  totalReportes: number;
  ultimoReporte: ReporteSeguimiento | null;
  totalTareas: number;
  tareasCompletadas: number;
  tareasEnCurso: number;
  tareasEnPlazo: number;
  tareasProximas: number;
  tareasAtrasadas: number;
  tareasSinFecha: number;
};

type UseReportesSeguimientoResult = {
  reportes: ReporteSeguimiento[];
  reportesFiltrados: ReporteSeguimiento[];
  resumen: ReportesResumen;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  estado: EstadoFiltro;
  setEstado: (value: EstadoFiltro) => void;
  refresh: () => void;
};

type UseReportesSeguimientoOptions = {
  initialReportes?: ReporteSeguimiento[];
  initialError?: string | null;
  initialLoaded?: boolean;
};

export function useReportesSeguimiento({
  initialReportes = [],
  initialError = null,
  initialLoaded = false,
}: UseReportesSeguimientoOptions = {}): UseReportesSeguimientoResult {
  const [reportes, setReportes] = useState<ReporteSeguimiento[]>(initialReportes);
  const [loading, setLoading] = useState(!initialLoaded && initialReportes.length === 0 && initialError == null);
  const [error, setError] = useState<string | null>(initialError);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("todos");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReportes() {
      if (refreshToken === 0 && (initialLoaded || initialReportes.length > 0 || initialError != null)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/reportes-seguimiento", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudieron cargar los reportes de seguimiento");
        }

        const json = (await response.json()) as { data?: ReporteSeguimiento[] };
        setReportes(json.data ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchReportes();

    return () => controller.abort();
  }, [initialError, initialLoaded, initialReportes.length, refreshToken]);

  const reportesFiltrados = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reportes.filter((reporte) => {
      const matchesEstado = estado === "todos" || reporte.estado === estado;
      if (!matchesEstado) return false;
      if (!query) return true;

      return [
        reporte.titulo,
        reporte.asunto,
        reporte.destinatarios,
        reporte.enviado_a,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [reportes, search, estado]);

  const resumen = useMemo<ReportesResumen>(() => {
    const ultimoReporte = reportes[0] ?? null;

    return {
      totalReportes: reportes.length,
      ultimoReporte,
      totalTareas: ultimoReporte?.total_tareas ?? 0,
      tareasCompletadas: ultimoReporte?.tareas_completadas ?? 0,
      tareasEnCurso: ultimoReporte?.tareas_en_curso ?? 0,
      tareasEnPlazo: ultimoReporte?.tareas_en_plazo ?? 0,
      tareasProximas: ultimoReporte?.tareas_proximas ?? 0,
      tareasAtrasadas: ultimoReporte?.tareas_atrasadas ?? 0,
      tareasSinFecha: ultimoReporte?.tareas_sin_fecha ?? 0,
    };
  }, [reportes]);

  return useMemo(
    () => ({
      reportes,
      reportesFiltrados,
      resumen,
      loading,
      error,
      search,
      setSearch,
      estado,
      setEstado,
      refresh: () => setRefreshToken((value) => value + 1),
    }),
    [reportes, reportesFiltrados, resumen, loading, error, search, estado],
  );
}
