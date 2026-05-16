import { parse } from "node-html-parser";

import { normalizeText } from "@/src/lib/chat-general-task-resolution";
import { truncateText } from "@/src/lib/chat-text";
import type { TareaContext } from "@/src/types/chat";
import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";

export type SourceFreshness = "report_mas_reciente" | "trello_mas_reciente" | "sin_fecha_suficiente";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function toRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JsonRecord => item != null && typeof item === "object" && !Array.isArray(item));
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestDate(values: Array<string | null | undefined>): Date | null {
  return values
    .map(parseDate)
    .filter((date): date is Date => date != null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

function formatDateForContext(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return value?.trim() || "N/D";
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/D";
  return `${value.toLocaleString("es-EC", { maximumFractionDigits: 2 })}${suffix}`;
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/D";
  return `$${value.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function stringifyCompact(value: unknown, maxChars: number): string {
  if (value == null) return "N/D";
  if (typeof value === "string") return truncateText(value, maxChars);
  try {
    return truncateText(JSON.stringify(value, null, 2), maxChars);
  } catch {
    return "N/D";
  }
}

function getText(record: JsonRecord | null, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function htmlToUsefulText(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const root = parse(html);
  const text = root.structuredText.trim().replace(/\n{3,}/g, "\n\n");
  return text ? truncateText(text, 3600) : null;
}

function hasBudgetInfo(report: ReporteSeguimiento): boolean {
  return Boolean(
    report.presupuesto ||
      report.presupuesto_total ||
      report.costo_real_total ||
      report.variacion_costo ||
      report.ejecucion_presupuestaria ||
      (report.estado_presupuesto && report.estado_presupuesto !== "sin_datos"),
  );
}

function buildBudgetContext(report: ReporteSeguimiento): string {
  if (!hasBudgetInfo(report)) return "## Presupuesto consolidado\nEl ultimo reporte no contiene informacion presupuestaria registrada.";

  const presupuesto = asRecord(report.presupuesto);
  const detailByPhase = presupuesto?.detalle_por_fase;
  const detailByTask = presupuesto?.detalle_por_tarea;
  const interpretation = getText(presupuesto, ["interpretacion", "interpretacion_presupuesto", "resumen"]);
  const costoEstimadoRegistrado = getText(presupuesto, ["costo_estimado_registrado", "total_costo_estimado_registrado"]);
  const cumplimientoRegistrado = getText(presupuesto, [
    "cumplimiento_presupuesto_registrado",
    "porcentaje_cumplimiento_presupuesto_registrado",
  ]);

  return [
    "## Presupuesto consolidado del ultimo reporte",
    `Presupuesto total inicial del proyecto: ${formatMoney(report.presupuesto_total)}`,
    `Costo real acumulado: ${formatMoney(report.costo_real_total)}`,
    `Variacion / saldo disponible: ${formatMoney(report.variacion_costo)}`,
    `Ejecucion presupuestaria: ${formatNumber(report.ejecucion_presupuestaria, "%")}`,
    `Estado presupuestario: ${report.estado_presupuesto ?? "sin_datos"}`,
    interpretation ? `Interpretacion: ${truncateText(interpretation, 900)}` : null,
    costoEstimadoRegistrado ? `Costo estimado registrado: ${costoEstimadoRegistrado}` : null,
    cumplimientoRegistrado
      ? `Cumplimiento presupuesto registrado: ${cumplimientoRegistrado} (no confundir con ejecucion presupuestaria general).`
      : null,
    detailByPhase ? `Detalle por fase: ${stringifyCompact(detailByPhase, 1800)}` : null,
    detailByTask ? `Detalle por tarea: ${stringifyCompact(detailByTask, 2600)}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function buildKpiContext(report: ReporteSeguimiento): string {
  if (!report.kpis && !report.resumen_kpis) {
    return "## KPIs del ultimo reporte\nEl ultimo reporte no contiene KPIs registrados.";
  }

  return [
    "## KPIs del ultimo reporte",
    report.resumen_kpis ? `Resumen KPIs: ${truncateText(report.resumen_kpis, 1200)}` : null,
    report.kpis ? `KPIs registrados: ${stringifyCompact(report.kpis, 2200)}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildReportContext(report: ReporteSeguimiento | null): string {
  if (!report) {
    return [
      "## Ultimo reporte de seguimiento n8n",
      "No existe un reporte de seguimiento generado todavia.",
      "Para preguntas generales, presupuesto, KPIs, riesgos o recomendaciones, informa esta ausencia y usa Trello solo como fuente operativa secundaria si aplica.",
    ].join("\n");
  }

  const generatedAt = report.fecha_revision ?? report.created_at ?? report.enviado_en;
  const narrative = report.resumen_ia?.trim() || htmlToUsefulText(report.html_reporte) || null;

  return [
    "## Ultimo reporte de seguimiento n8n (fuente consolidada principal)",
    `ID reporte: ${report.id}`,
    `Titulo: ${report.titulo}`,
    `Fecha del reporte: ${formatDateForContext(generatedAt)}`,
    `Created at: ${report.created_at ?? "N/D"}`,
    `Enviado en: ${report.enviado_en ?? "N/D"}`,
    `Archivo: ${report.archivo_url ?? "N/D"}`,
    "",
    "## Metricas consolidadas del reporte",
    `Total tareas: ${report.total_tareas ?? 0}`,
    `Tareas completadas: ${report.tareas_completadas ?? 0}`,
    `Tareas en curso: ${report.tareas_en_curso ?? 0}`,
    `Tareas en plazo: ${report.tareas_en_plazo ?? 0}`,
    `Tareas proximas: ${report.tareas_proximas ?? 0}`,
    `Tareas atrasadas: ${report.tareas_atrasadas ?? 0}`,
    `Tareas sin fecha: ${report.tareas_sin_fecha ?? 0}`,
    "",
    buildKpiContext(report),
    "",
    buildBudgetContext(report),
    "",
    "## Resumen, riesgos y recomendaciones del reporte",
    narrative ? truncateText(narrative, 3600) : "No hay resumen IA ni texto util de html_reporte en el ultimo reporte.",
  ].join("\n");
}

function getReportDate(report: ReporteSeguimiento | null): Date | null {
  if (!report) return null;
  return latestDate([report.fecha_revision, report.created_at, report.enviado_en]);
}

function getTaskDate(task: TareaContext | null): Date | null {
  if (!task) return null;
  return latestDate([
    task.dateLastActivity,
    task.updated_at,
    task.fecha_sincronizacion,
    task.fecha_revision,
    task.created_at,
  ]);
}

export function compareSourceFreshness(report: ReporteSeguimiento | null, task: TareaContext | null): SourceFreshness {
  const reportDate = getReportDate(report);
  const taskDate = getTaskDate(task);

  if (!reportDate || !taskDate) return "sin_fecha_suficiente";
  if (taskDate.getTime() > reportDate.getTime()) return "trello_mas_reciente";
  if (reportDate.getTime() > taskDate.getTime()) return "report_mas_reciente";
  return "sin_fecha_suficiente";
}

function getTaskTechnicalId(task: TareaContext): string | null {
  const description = task.descripcion ?? "";
  const idMatch = description.match(/(?:^|\n)\s*ID\s*:\s*([A-Z]{2,4}\d{1,3})\b/i);
  if (idMatch?.[1]) return idMatch[1].toUpperCase();
  const idTarea = task.id_tarea?.trim();
  if (/^[A-Z]{2,4}\d{1,3}$/i.test(idTarea)) return idTarea.toUpperCase();
  return null;
}

function getLineValue(text: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || null;
}

function buildTrelloBudgetDescriptionContext(task: TareaContext): string {
  const description = task.descripcion ?? "";
  const rows = [
    ["ID tecnico", getTaskTechnicalId(task)],
    ["Modulo", getLineValue(description, "Modulo") ?? getLineValue(description, "Módulo")],
    ["Costo estimado", getLineValue(description, "Costo estimado")],
    ["Costo real", getLineValue(description, "Costo real")],
    ["Horas estimadas", getLineValue(description, "Horas estimadas")],
    ["Horas trabajadas", getLineValue(description, "Horas trabajadas")],
    ["Tarifa hora", getLineValue(description, "Tarifa hora")],
    ["Recurso responsable", getLineValue(description, "Recurso responsable")],
    ["Tipo de recurso", getLineValue(description, "Tipo de recurso")],
    ["Observacion costo", getLineValue(description, "Observacion costo") ?? getLineValue(description, "Observación costo")],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (rows.length === 0) return "No se detectaron campos presupuestarios estructurados en la descripcion Trello.";
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

function matchTaskBudgetDetail(task: TareaContext, report: ReporteSeguimiento | null): JsonRecord | null {
  const presupuesto = asRecord(report?.presupuesto);
  const rows = toRecordArray(presupuesto?.detalle_por_tarea);
  if (rows.length === 0) return null;

  const technicalId = getTaskTechnicalId(task);
  const targets = [
    technicalId,
    task.id_tarea,
    task.titulo,
    task.url_tarjeta,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeText);

  return (
    rows.find((row) => {
      const searchable = [
        row.id,
        row.id_tarea,
        row.codigo,
        row.tarea,
        row.titulo,
        row.nombre,
        row.modulo,
        row.url_tarjeta,
      ]
        .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
        .map((value) => normalizeText(String(value)))
        .join(" ");

      return targets.some((target) => target && searchable.includes(target));
    }) ?? null
  );
}

export function buildTaskContext(task: TareaContext, latestReport: ReporteSeguimiento | null): string {
  const freshness = compareSourceFreshness(latestReport, task);
  const detail = matchTaskBudgetDetail(task, latestReport);
  const technicalId = getTaskTechnicalId(task);
  const reportDate = latestReport ? formatDateForContext(latestReport.fecha_revision ?? latestReport.created_at) : "N/D";
  const taskDate =
    task.dateLastActivity ?? task.updated_at ?? task.fecha_sincronizacion ?? task.fecha_revision ?? task.created_at ?? "N/D";

  const freshnessNote =
    freshness === "trello_mas_reciente"
      ? "Trello/tareas sincronizadas es mas reciente para el estado operativo de esta tarea."
      : freshness === "report_mas_reciente"
        ? "El ultimo reporte es mas reciente para analisis consolidado y presupuesto registrado."
        : "No hay fecha suficiente para decidir prioridad absoluta; usar reporte como referencia consolidada y Trello como operativa.";

  return [
    "## Contexto cruzado reporte n8n + Trello para esta tarea",
    `ID tecnico detectado: ${technicalId ?? "N/D"}`,
    `Fecha ultimo reporte: ${reportDate}`,
    `Fecha operativa tarea/Trello: ${taskDate}`,
    `Frescura comparada: ${freshness}`,
    `Regla aplicada: ${freshnessNote}`,
    `Estado Trello/tarea: ${task.estado_seguimiento ?? task.estado ?? "N/D"}`,
    "",
    "### Presupuesto de la tarea segun ultimo reporte",
    detail ? stringifyCompact(detail, 1600) : "No se encontro detalle_por_tarea coincidente en el ultimo reporte.",
    "",
    "### Presupuesto extraido de descripcion Trello",
    buildTrelloBudgetDescriptionContext(task),
  ].join("\n");
}

