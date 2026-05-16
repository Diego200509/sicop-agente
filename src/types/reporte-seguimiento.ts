export type ReporteSeguimientoEstado = "generado" | "enviado" | "error";

export type ReporteSeguimientoKpis = Record<string, unknown> | Array<Record<string, unknown>>;

export interface ReporteSeguimiento {
  id: string;
  titulo: string;
  tipo_reporte: string;
  fecha_revision: string;
  total_tareas: number;
  tareas_completadas: number;
  tareas_en_curso?: number;
  tareas_proximas: number;
  tareas_atrasadas: number;
  tareas_sin_fecha: number;
  tareas_en_plazo: number;
  kpis?: ReporteSeguimientoKpis | null;
  resumen_kpis?: string | null;
  kpi_cumplimiento_cronograma?: number | null;
  kpi_tasa_defectos?: number | null;
  kpi_productividad_equipo?: number | null;
  kpi_cumplimiento_requerimientos?: number | null;
  kpi_eficiencia_flujo?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presupuesto?: any;
  presupuesto_total?: number;
  costo_real_total?: number;
  variacion_costo?: number;
  ejecucion_presupuestaria?: number;
  estado_presupuesto?: string;
  html_reporte?: string | null;
  resumen_ia?: string | null;
  mensaje_html?: string | null;
  archivo_nombre?: string | null;
  archivo_url?: string | null;
  archivo_path?: string | null;
  enviado_a?: string | null;
  destinatarios?: string | null;
  asunto?: string | null;
  estado: ReporteSeguimientoEstado;
  enviado_en?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}
