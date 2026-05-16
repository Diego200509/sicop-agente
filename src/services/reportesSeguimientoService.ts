import { createClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/src/lib/supabase/client";
import type {
  ReporteSeguimiento,
  ReporteSeguimientoEstado,
} from "@/src/types/reporte-seguimiento";

type ReporteSeguimientoRow = Partial<ReporteSeguimiento> & {
  id: string;
  created_at: string;
};

function getBackendSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  console.warn(
    "Leyendo reportes_seguimiento con credenciales publicas: define SUPABASE_SERVICE_ROLE_KEY en backend si RLS bloquea la consulta.",
  );
  return getSupabaseClient();
}

export async function getReportesSeguimiento(): Promise<ReporteSeguimiento[]> {
  const supabase = getBackendSupabaseClient();
  const { data, error } = await supabase
    .from("reportes_seguimiento")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudieron obtener los reportes de seguimiento: ${error.message}`);
  }

  return (data ?? []).map(mapReporteSeguimiento);
}

export async function getReporteSeguimientoById(id: string): Promise<ReporteSeguimiento | null> {
  const supabase = getBackendSupabaseClient();
  const { data, error } = await supabase
    .from("reportes_seguimiento")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el reporte de seguimiento: ${error.message}`);
  }

  return data ? mapReporteSeguimiento(data as unknown as ReporteSeguimientoRow) : null;
}

function mapReporteSeguimiento(row: ReporteSeguimientoRow): ReporteSeguimiento {
  const metadataFechaRevision = getMetadataString(row.metadata, "fecha_revision");

  return {
    id: row.id,
    titulo: row.titulo ?? "Reporte automático de seguimiento SICOP",
    tipo_reporte: row.tipo_reporte ?? "seguimiento_autonomo",
    fecha_revision: metadataFechaRevision ?? row.fecha_revision ?? row.created_at,
    total_tareas: normalizeNumber(row.total_tareas),
    tareas_completadas: normalizeNumber(row.tareas_completadas),
    tareas_en_curso: normalizeNumber(row.tareas_en_curso),
    tareas_proximas: normalizeNumber(row.tareas_proximas),
    tareas_atrasadas: normalizeNumber(row.tareas_atrasadas),
    tareas_sin_fecha: normalizeNumber(row.tareas_sin_fecha),
    tareas_en_plazo: normalizeNumber(row.tareas_en_plazo),
    kpis: normalizeKpis(row.kpis),
    resumen_kpis: row.resumen_kpis ?? null,
    kpi_cumplimiento_cronograma: normalizeOptionalNumber(row.kpi_cumplimiento_cronograma),
    kpi_tasa_defectos: normalizeOptionalNumber(row.kpi_tasa_defectos),
    kpi_productividad_equipo: normalizeOptionalNumber(row.kpi_productividad_equipo),
    kpi_cumplimiento_requerimientos: normalizeOptionalNumber(row.kpi_cumplimiento_requerimientos),
    kpi_eficiencia_flujo: normalizeOptionalNumber(row.kpi_eficiencia_flujo),
    presupuesto: normalizePresupuesto(row.presupuesto),
    presupuesto_total: normalizeNumber(row.presupuesto_total),
    costo_real_total: normalizeNumber(row.costo_real_total),
    variacion_costo: normalizeNumber(row.variacion_costo),
    ejecucion_presupuestaria: normalizeNumber(row.ejecucion_presupuestaria),
    estado_presupuesto: normalizeEstadoPresupuesto(row.estado_presupuesto),
    html_reporte: row.html_reporte ?? null,
    resumen_ia: row.resumen_ia ?? null,
    mensaje_html: row.mensaje_html ?? null,
    archivo_nombre: row.archivo_nombre ?? null,
    archivo_url: row.archivo_url ?? null,
    archivo_path: row.archivo_path ?? null,
    enviado_a: row.enviado_a ?? null,
    destinatarios: row.destinatarios ?? null,
    asunto: row.asunto ?? null,
    estado: normalizeEstado(row.estado),
    enviado_en: row.enviado_en ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at,
  };
}

export async function getLatestSeguimientoReport(): Promise<ReporteSeguimiento | null> {
  const supabase = getBackendSupabaseClient();
  const { data, error } = await supabase
    .from("reportes_seguimiento")
    .select(
      [
        "id",
        "titulo",
        "tipo_reporte",
        "fecha_revision",
        "created_at",
        "enviado_en",
        "total_tareas",
        "tareas_completadas",
        "tareas_en_curso",
        "tareas_proximas",
        "tareas_atrasadas",
        "tareas_sin_fecha",
        "tareas_en_plazo",
        "kpis",
        "resumen_kpis",
        "presupuesto",
        "presupuesto_total",
        "costo_real_total",
        "variacion_costo",
        "ejecucion_presupuestaria",
        "estado_presupuesto",
        "resumen_ia",
        "html_reporte",
        "archivo_url",
        "estado",
        "metadata",
      ].join(","),
    )
    .order("fecha_revision", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el ultimo reporte de seguimiento: ${error.message}`);
  }

  return data ? mapReporteSeguimiento(data as unknown as ReporteSeguimientoRow) : null;
}

function getMetadataString(metadata: unknown, key: string): string | null {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value !== "string") return null;

  const text = value.trim();
  return text ? text : null;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return 0;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return null;
}

function normalizeKpis(value: unknown): ReporteSeguimiento["kpis"] {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object" && !Array.isArray(item),
    );
  }
  if (typeof value === "object") return value as Record<string, unknown>;

  return null;
}

function normalizePresupuesto(value: unknown): ReporteSeguimiento["presupuesto"] {
  if (value == null) return null;
  if (typeof value === "object") return value;

  return null;
}

function normalizeEstado(value: unknown): ReporteSeguimientoEstado {
  return value === "enviado" || value === "error" ? value : "generado";
}

function normalizeEstadoPresupuesto(value: unknown): string {
  if (typeof value !== "string") return "sin_datos";

  const text = value.trim();
  return text ? text : "sin_datos";
}
