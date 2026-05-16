import { HTMLElement, parse } from "node-html-parser";

import { normalizeText } from "@/src/lib/chat-general-task-resolution";
import { getLatestSeguimientoReport } from "@/src/services/reportesSeguimientoService";
import type { TareaContext } from "@/src/types/chat";
import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";
import type { TareasRepository } from "@/src/repositories/tareas.repository";

export type ActiveTaskFromReport = {
  titulo: string;
  fase?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  dias_restantes?: string;
  url?: string;
};

type ReportTaskSection =
  | "completed"
  | "inProgress"
  | "onTrack"
  | "upcoming"
  | "overdue"
  | "withoutEndDate";

const KNOWN_REPORT_SECTION_TITLES = [
  "Tareas completadas",
  "Tareas en curso",
  "Tareas en plazo",
  "Tareas próximas a terminarse",
  "Tareas atrasadas",
  "Tareas sin fecha fin",
  "Riesgos detectados",
  "Sugerencias concretas para el gestor",
  "Próximas acciones recomendadas",
] as const;

const TASK_STATUS_SECTION_TITLES: Record<ReportTaskSection, string> = {
  completed: "Tareas completadas",
  inProgress: "Tareas en curso",
  onTrack: "Tareas en plazo",
  upcoming: "Tareas próximas a terminarse",
  overdue: "Tareas atrasadas",
  withoutEndDate: "Tareas sin fecha fin",
};

const ACTIVE_TASK_PATTERNS = [
  /\btareas?\s+en\s+curso\b/i,
  /\btareas?\s+activas?\b/i,
  /\btareas?\s+en\s+ejecucion\b/i,
  /\bactualmente\s+en\s+ejecucion\b/i,
  /\bque\s+se\s+esta\s+trabajando\b/i,
  /\bse\s+esta\s+trabajando\b/i,
  /\btrabajando\s+actualmente\b/i,
];

const TASK_STATUS_PATTERNS = [
  ...ACTIVE_TASK_PATTERNS,
  /\btareas?\s+complet(?:as|adas|os|ados)\b/i,
  /\btareas?\s+cumplid(?:as|os)\b/i,
  /\btareas?\s+en\s+plazo\b/i,
  /\btareas?\s+proximas?\b/i,
  /\btareas?\s+atrasadas?\b/i,
  /\btareas?\s+sin\s+fecha\b/i,
  /\bestado\s+de\s+(?:las\s+)?tareas\b/i,
  /\bcomo\s+estan\s+clasificadas?\s+(?:las\s+)?tareas\b/i,
];

export function isActiveTasksQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return ACTIVE_TASK_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isTaskStatusReportQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return TASK_STATUS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isTaskStatusClassificationQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return (
    /\b(completas|completadas|completados|cumplidas|cumplidos|en plazo|proximas|atrasadas|sin fecha)\b/.test(normalized) ||
    /\bestado\s+de\s+(?:las\s+)?tareas\b/.test(normalized) ||
    /\bcomo\s+estan\s+clasificadas?\s+(?:las\s+)?tareas\b/.test(normalized)
  );
}

export async function answerActiveTasksQuestion(tareasRepo: TareasRepository): Promise<string> {
  const latestReport = await getLatestSeguimientoReport();

  if (!latestReport) {
    const fallbackTasks = await tareasRepo.getTareasEnCurso();
    if (fallbackTasks.length === 0) {
      return "No existe un reporte de seguimiento generado todavia y no encontre tareas sincronizadas en curso.";
    }

    return [
      "No existe un reporte de seguimiento generado todavia. Con base en las tareas sincronizadas, encontre:",
      formatTaskList(fallbackTasks.map(mapDbTaskToActiveTask)),
    ].join("\n\n");
  }

  const count = latestReport.tareas_en_curso ?? 0;
  if (count <= 0) {
    return "Segun el ultimo reporte de seguimiento, no se registran tareas en curso.";
  }

  const reportTasks = extractTareasEnCursoFromReportFields(latestReport.mensaje_html, latestReport.html_reporte);
  if (reportTasks.length > 0) {
    return formatReportActiveTasksAnswer(count, reportTasks);
  }

  const fallbackTasks = await tareasRepo.getTareasEnCurso();
  if (fallbackTasks.length > 0) {
    return [
      `El ultimo reporte registra ${count} tarea(s) en curso, pero no se pudo extraer el detalle desde el HTML del reporte. Como respaldo, calcule tareas en curso con inicio, fin y completado:`,
      formatTaskList(fallbackTasks.map(mapDbTaskToActiveTask)),
    ].join("\n\n");
  }

  return `El ultimo reporte registra ${count} tarea(s) en curso, pero no se pudo extraer el detalle desde el HTML del reporte. Se recomienda revisar la sincronizacion.`;
}

export async function answerTaskStatusReportQuestion(message: string, tareasRepo: TareasRepository): Promise<string> {
  const latestReport = await getLatestSeguimientoReport();
  const requested = resolveRequestedSections(message);

  if (!latestReport) {
    if (!requested.includes("inProgress")) {
      return "No existe un reporte de seguimiento generado todavia. Para clasificar completadas, en plazo y otros estados necesito el ultimo reporte o una consulta operativa especifica.";
    }

    const fallbackTasks = await tareasRepo.getTareasEnCurso();
    if (fallbackTasks.length === 0) {
      return "No existe un reporte de seguimiento generado todavia y no encontre tareas sincronizadas en curso.";
    }

    return [
      "No existe un reporte de seguimiento generado todavia. Con base en las tareas sincronizadas, encontre estas tareas en curso:",
      formatTaskList(fallbackTasks.map(mapDbTaskToActiveTask)),
    ].join("\n\n");
  }

  const sections = extractStatusSectionsFromReport(latestReport.mensaje_html, latestReport.html_reporte);
  const lines = ["Segun el ultimo reporte de seguimiento:"];

  for (const section of requested) {
    lines.push(formatStatusSectionLine(section, sections, latestReport));
  }

  return lines.join("\n");
}

export function extractTareasEnCursoFromHtml(html: string): ActiveTaskFromReport[] {
  return extractTareasEnCursoFromReporte(html);
}

export function extractTareasEnCursoFromReporte(html: string): ActiveTaskFromReport[] {
  if (!html.trim()) return [];

  const completedTitles = new Set(extractSectionTableFromHtml(html, "Tareas completadas").map((task) => normalizeText(task.titulo)));

  return extractSectionTableFromHtml(html, "Tareas en curso")
    .filter((task) => !isCompletedReportTask(task))
    .filter((task) => !completedTitles.has(normalizeText(task.titulo)));
}

function extractTareasEnCursoFromReportFields(...htmlValues: Array<string | null | undefined>): ActiveTaskFromReport[] {
  for (const html of htmlValues) {
    const tasks = extractTareasEnCursoFromReporte(html ?? "");
    if (tasks.length > 0) return tasks;
  }

  return [];
}

function resolveRequestedSections(message: string): ReportTaskSection[] {
  const normalized = normalizeText(message);
  const requested: ReportTaskSection[] = [];

  if (/\b(completas|completadas|completados|cumplidas|cumplidos)\b/.test(normalized)) requested.push("completed");
  if (/\b(en curso|activas|en ejecucion|trabajando actualmente|se esta trabajando)\b/.test(normalized)) requested.push("inProgress");
  if (/\ben plazo\b/.test(normalized)) requested.push("onTrack");
  if (/\b(proximas|proxima a terminar|proximas a terminar)\b/.test(normalized)) requested.push("upcoming");
  if (/\batrasadas\b/.test(normalized)) requested.push("overdue");
  if (/\bsin fecha\b/.test(normalized)) requested.push("withoutEndDate");

  if (requested.length > 0) return requested;

  return ["completed", "inProgress", "onTrack", "upcoming", "overdue", "withoutEndDate"];
}

function extractStatusSectionsFromReport(
  ...htmlValues: Array<string | null | undefined>
): Record<ReportTaskSection, ActiveTaskFromReport[]> {
  const sections: Record<ReportTaskSection, ActiveTaskFromReport[]> = {
    completed: [],
    inProgress: [],
    onTrack: [],
    upcoming: [],
    overdue: [],
    withoutEndDate: [],
  };

  for (const section of Object.keys(sections) as ReportTaskSection[]) {
    for (const html of htmlValues) {
      const tasks = extractTaskSectionFromReport(html ?? "", TASK_STATUS_SECTION_TITLES[section]);
      if (tasks.length > 0) {
        sections[section] = tasks;
        break;
      }
    }
  }

  return sanitizeStatusSections(sections);
}

function sanitizeStatusSections(
  sections: Record<ReportTaskSection, ActiveTaskFromReport[]>,
): Record<ReportTaskSection, ActiveTaskFromReport[]> {
  const completedTitles = new Set(sections.completed.map((task) => normalizeText(task.titulo)));
  const overdueTitles = new Set(sections.overdue.map((task) => normalizeText(task.titulo)));
  const upcomingTitles = new Set(sections.upcoming.map((task) => normalizeText(task.titulo)));

  sections.inProgress = sections.inProgress.filter((task) => !completedTitles.has(normalizeText(task.titulo)) && !isCompletedReportTask(task));

  const inProgressTitles = new Set(sections.inProgress.map((task) => normalizeText(task.titulo)));
  sections.onTrack = sections.onTrack.filter((task) => {
    const title = normalizeText(task.titulo);
    return !completedTitles.has(title) && !overdueTitles.has(title) && !upcomingTitles.has(title) && !inProgressTitles.has(title);
  });

  sections.upcoming = sections.upcoming.filter((task) => !completedTitles.has(normalizeText(task.titulo)));
  sections.overdue = sections.overdue.filter((task) => !completedTitles.has(normalizeText(task.titulo)));
  sections.withoutEndDate = sections.withoutEndDate.filter((task) => !completedTitles.has(normalizeText(task.titulo)));

  return sections;
}

function formatStatusSectionLine(
  section: ReportTaskSection,
  sections: Record<ReportTaskSection, ActiveTaskFromReport[]>,
  report: ReporteSeguimiento,
): string {
  const tasks = sections[section];

  if (section === "completed") {
    return tasks.length > 0
      ? `- Hay ${report.tareas_completadas ?? tasks.length} tareas completadas:\n${formatTaskList(tasks)}`
      : `- Hay ${report.tareas_completadas ?? 0} tareas completadas.`;
  }

  if (section === "inProgress") {
    if (tasks.length > 0) return `- Hay ${report.tareas_en_curso ?? tasks.length} tarea(s) en curso: ${formatTaskSentence(tasks[0])}`;
    return `- Hay ${report.tareas_en_curso ?? 0} tarea(s) en curso, pero no se pudo extraer la tabla detallada desde el reporte.`;
  }

  if (section === "onTrack") {
    if (tasks.length > 0) return `- Hay ${report.tareas_en_plazo ?? tasks.length} tarea(s) en plazo:\n${formatTaskList(tasks)}`;
    return `- Hay ${report.tareas_en_plazo ?? 0} tareas en plazo. El reporte registra el conteo, pero no incluye una tabla detallada de tareas en plazo; puedo calcularlas desde la tabla de tareas si deseas el listado operativo.`;
  }

  if (section === "upcoming") {
    return tasks.length > 0
      ? `- Hay ${report.tareas_proximas ?? tasks.length} tarea(s) proximas a terminarse:\n${formatTaskList(tasks)}`
      : `- Hay ${report.tareas_proximas ?? 0} tarea(s) proximas a terminarse.`;
  }

  if (section === "overdue") {
    return tasks.length > 0
      ? `- Hay ${report.tareas_atrasadas ?? tasks.length} tarea(s) atrasadas:\n${formatTaskList(tasks)}`
      : `- Hay ${report.tareas_atrasadas ?? 0} tarea(s) atrasadas.`;
  }

  return tasks.length > 0
    ? `- Hay ${report.tareas_sin_fecha ?? tasks.length} tarea(s) sin fecha fin:\n${formatTaskList(tasks)}`
    : `- Hay ${report.tareas_sin_fecha ?? 0} tarea(s) sin fecha fin.`;
}

export function extractSectionTableFromHtml(html: string, sectionTitle: string): ActiveTaskFromReport[] {
  return extractTaskSectionFromReport(html, sectionTitle);
}

export function extractTaskSectionFromReport(html: string, sectionTitle: string): ActiveTaskFromReport[] {
  if (!html.trim()) return [];

  const fromHtml = extractHtmlTaskSection(html, sectionTitle);
  if (fromHtml.length > 0) return fromHtml;

  return extractPlainTextTaskSection(html, sectionTitle);
}

function extractHtmlTaskSection(html: string, sectionTitle: string): ActiveTaskFromReport[] {
  const root = parse(html);
  const wanted = normalizeSectionTitle(sectionTitle);
  const headings = root.querySelectorAll("h1,h2,h3,h4,h5,h6");
  const heading = headings.find((node) => normalizeSectionTitle(node.textContent) === wanted);
  if (!heading) return [];

  const table = findFirstTableAfterHeading(heading);

  if (!table) return [];

  const headers = table.querySelectorAll("th").map((cell) => normalizeText(cell.textContent));
  const rows = table.querySelectorAll("tbody tr");
  const tableRows = rows.length > 0 ? rows : table.querySelectorAll("tr").filter((row) => row.querySelectorAll("td").length > 0);

  return tableRows
    .map((row) => row.querySelectorAll("td"))
    .map((cells) => mapCellsToActiveTask(cells, headers))
    .filter((task): task is ActiveTaskFromReport => Boolean(task?.titulo));
}

function extractPlainTextTaskSection(text: string, sectionTitle: string): ActiveTaskFromReport[] {
  const root = parse(text);
  const plainText = root.structuredText.trim() || text;
  const lines = plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const wanted = normalizeSectionTitle(sectionTitle);
  const startIndex = lines.findIndex((line) => normalizeSectionTitle(line) === wanted);
  if (startIndex < 0) return [];

  const sectionLines = lines.slice(startIndex + 1);
  const endIndex = sectionLines.findIndex((line) => isKnownReportSectionTitle(line));
  const scopedLines = endIndex >= 0 ? sectionLines.slice(0, endIndex) : sectionLines;

  return parseTextRows(scopedLines);
}

function parseTextRows(lines: string[]): ActiveTaskFromReport[] {
  const rows = lines
    .map((line) => line.split(/\t+|\s{2,}|\s*\|\s*/).map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 2 && !isHeaderRow(cells));

  return rows
    .map((cells) => ({
      titulo: cells[0] ?? "",
      fase: cells[1],
      fecha_inicio: cells[2],
      fecha_fin: cells[3],
      dias_restantes: cells[4],
      url: cells[5],
    }))
    .filter((task) => task.titulo);
}

function findFirstTableAfterHeading(heading: HTMLElement): HTMLElement | null {
  let sibling = heading.nextElementSibling;

  while (sibling) {
    const tagName = sibling.rawTagName?.toLowerCase();
    if (tagName && /^h[1-6]$/.test(tagName)) return null;
    if (tagName === "table") return sibling;

    const table = findTableBeforeNestedHeading(sibling);
    if (table) return table;

    sibling = sibling.nextElementSibling;
  }

  return null;
}

function findTableBeforeNestedHeading(node: HTMLElement): HTMLElement | null {
  for (const child of node.childNodes) {
    if (!(child instanceof HTMLElement)) continue;

    const tagName = child.rawTagName?.toLowerCase();
    if (tagName && /^h[1-6]$/.test(tagName)) return null;
    if (tagName === "table") return child;

    const table = findTableBeforeNestedHeading(child);
    if (table) return table;
  }

  return null;
}

function mapCellsToActiveTask(cells: HTMLElement[], headers: string[]): ActiveTaskFromReport | null {
  if (cells.length === 0) return null;

  const read = (aliases: string[], fallbackIndex: number): string | undefined => {
    const index = findHeaderIndex(headers, aliases);
    const cell = cells[index >= 0 ? index : fallbackIndex];
    const text = cell?.textContent.trim().replace(/\s+/g, " ");
    return text || undefined;
  };

  const urlIndex = findHeaderIndex(headers, ["url", "enlace", "link"]);
  const urlCell = cells[urlIndex >= 0 ? urlIndex : 5];
  const url = urlCell?.querySelector("a")?.getAttribute("href")?.trim() || urlCell?.textContent.trim() || undefined;

  return {
    titulo: read(["titulo", "tarea", "nombre"], 0) ?? "",
    fase: read(["fase"], 1),
    fecha_inicio: read(["fecha inicio", "inicio"], 2),
    fecha_fin: read(["fecha fin", "fin"], 3),
    dias_restantes: read(["dias restantes", "dias", "restantes"], 4),
    url,
  };
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map(normalizeText);
  return headers.findIndex((header) => normalizedAliases.some((alias) => header === alias || header.includes(alias)));
}

function normalizeSectionTitle(value: string): string {
  return normalizeText(value).replace(/\s+\d+$/, "").replace(/\s*\(\s*\d+\s*\)$/, "");
}

function isKnownReportSectionTitle(value: string): boolean {
  const normalized = normalizeSectionTitle(value);
  return KNOWN_REPORT_SECTION_TITLES.some((title) => normalizeSectionTitle(title) === normalized);
}

function isHeaderRow(cells: string[]): boolean {
  const normalized = cells.map(normalizeText).join(" ");
  return normalized.includes("titulo") && normalized.includes("fase");
}

function isCompletedReportTask(task: ActiveTaskFromReport): boolean {
  const text = normalizeText(Object.values(task).filter(Boolean).join(" "));
  return /\b(completada|completado|cumplida|cumplido)\b/.test(text);
}

function formatReportActiveTasksAnswer(count: number, tasks: ActiveTaskFromReport[]): string {
  const countText = count === 1 ? "existe 1 tarea en curso" : `existen ${count} tareas en curso`;
  const taskText = tasks.length === 1 ? formatTaskSentence(tasks[0]) : `\n${formatTaskList(tasks)}`;
  const mismatch =
    tasks.length !== count
      ? `\n\nNota: el ultimo reporte registra ${count} tarea(s) en curso y se extrajeron ${tasks.length} fila(s) de detalle del HTML.`
      : "";

  return `Segun el ultimo reporte de seguimiento, actualmente ${countText}: ${taskText}${mismatch}`;
}

function formatTaskSentence(task: ActiveTaskFromReport): string {
  const parts = [
    task.titulo,
    task.fase ? `correspondiente a la fase ${task.fase}` : null,
    task.fecha_inicio ? `su fecha de inicio es ${task.fecha_inicio}` : null,
    task.fecha_fin ? `su fecha fin es ${task.fecha_fin}` : null,
    task.dias_restantes ? `y tiene ${task.dias_restantes} dias restantes` : null,
  ].filter(Boolean);

  return `${parts.join(", ")}.`;
}

function formatTaskList(tasks: ActiveTaskFromReport[]): string {
  if (tasks.length === 0) return "Sin tareas registradas.";

  const rows = tasks.map((task, index) =>
    [
      String(index + 1),
      escapeMarkdownTableCell(task.titulo),
      escapeMarkdownTableCell(task.fase ?? "N/D"),
      escapeMarkdownTableCell(task.fecha_inicio ?? "N/D"),
      escapeMarkdownTableCell(task.fecha_fin ?? "N/D"),
      escapeMarkdownTableCell(task.dias_restantes ?? "N/D"),
      formatTaskLink(task.url),
    ].join(" | "),
  );

  return [
    "| # | Tarea | Fase | Inicio | Fin | Estado/Dias | Enlace |",
    "|---:|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function formatTaskLink(url: string | undefined): string {
  const clean = url?.trim();
  if (!clean) return "N/D";
  return `[Ver tarea](${clean})`;
}

function mapDbTaskToActiveTask(task: TareaContext): ActiveTaskFromReport {
  return {
    titulo: task.titulo,
    fase: task.fase,
    fecha_inicio: formatDbDate(task.inicio),
    fecha_fin: formatDbDate(task.fin),
    url: task.url_tarjeta ?? undefined,
  };
}

function formatDbDate(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim();

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Guayaquil",
  }).format(date);
}
