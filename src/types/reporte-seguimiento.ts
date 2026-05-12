export type ReporteSeguimientoEstado = "generado" | "enviado" | "error";

export interface ReporteSeguimiento {
  id: string;
  titulo: string;
  tipo_reporte: string;
  fecha_revision: string;
  total_tareas: number;
  tareas_completadas: number;
  tareas_proximas: number;
  tareas_atrasadas: number;
  tareas_sin_fecha: number;
  tareas_en_plazo: number;
  html_reporte?: string | null;
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
