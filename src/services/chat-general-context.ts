import type { ChatRepository } from "@/src/repositories/chat.repository";
import type { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import type { TareasRepository } from "@/src/repositories/tareas.repository";
import { getChatGeneralConfig, type ChatGeneralConfig } from "@/src/lib/chat-general-config";
import { truncateText } from "@/src/lib/chat-text";
import type { RevisionContext } from "@/src/types/chat";

function formatHistoryBlock(messages: Array<{ rol: string; mensaje: string }>, maxMsg: number): string {
  if (messages.length === 0) return "(Sin mensajes previos en este hilo)";
  return messages
    .map((m) => `${m.rol === "user" ? "Usuario" : "Asistente"}: ${truncateText(m.mensaje, maxMsg)}`)
    .join("\n");
}

function formatRevisionDocGeneral(r: RevisionContext | null, maxAnalysis: number): string {
  if (!r) return "(Sin revision documental registrada)";
  return [
    `Fecha ultima revision documental: ${r.fecha_revision ?? "N/D"}`,
    `Analisis documental (extracto): ${truncateText(r.analisis_documental, maxAnalysis) || "(sin analisis)"}`,
  ].join("\n");
}

function formatRevisionCodeGeneral(r: RevisionContext | null, maxAnalysis: number): string {
  if (!r) return "(Sin revision de codigo registrada)";
  const repo = [r.repo_owner, r.repo_name].filter(Boolean).join("/");
  return [
    `Fecha ultima revision codigo: ${r.fecha_revision ?? "N/D"}`,
    `PR: ${r.pr_title ?? "N/D"} | Repo: ${repo || "N/D"}`,
    `Analisis codigo (extracto): ${truncateText(r.analisis_codigo, maxAnalysis) || "(sin analisis)"}`,
  ].join("\n");
}

function formatRevisionDocFocused(r: RevisionContext | null, maxPdf: number, maxAnalysis: number): string {
  if (!r) return "(Sin revision documental registrada)";
  const pdfPart =
    maxPdf > 0
      ? `Texto PDF (extracto breve, no completo): ${truncateText(r.texto_pdf, maxPdf)}`
      : "(Texto PDF omitido en este modo)";
  return [
    `Fecha: ${r.fecha_revision ?? "N/D"}`,
    pdfPart,
    `Analisis documental: ${truncateText(r.analisis_documental, maxAnalysis)}`,
  ].join("\n");
}

function formatRevisionCodeFocused(r: RevisionContext | null, maxCode: number, maxAnalysis: number): string {
  if (!r) return "(Sin revision de codigo registrada)";
  const repo = [r.repo_owner, r.repo_name].filter(Boolean).join("/");
  return [
    `Fecha: ${r.fecha_revision ?? "N/D"}`,
    `PR: ${r.pr_title ?? "N/D"} | Repo: ${repo || "N/D"}`,
    `Codigo PR (extracto): ${truncateText(r.codigo_pr, maxCode)}`,
    `Analisis codigo: ${truncateText(r.analisis_codigo, maxAnalysis)}`,
  ].join("\n");
}

export async function buildGeneralContext(
  tareasRepo: TareasRepository,
  revisionesRepo: RevisionesRepository,
  chatRepo: ChatRepository,
  config: ChatGeneralConfig = getChatGeneralConfig(),
): Promise<string> {
  const tareas = await tareasRepo.getLatestForGeneralChat(config.maxTasks);
  const ids = tareas.map((t) => t.id);
  const revMap = await revisionesRepo.getLatestDocAndCodeForTareas(ids);
  const history = await chatRepo.getLastMessagesForContext(null, 6);

  const bloquesTareas = tareas.map((t) => {
    const pair = revMap.get(t.id);
    const doc = pair?.doc ?? null;
    const code = pair?.code ?? null;
    return [
      `### ${t.id_tarea} — ${t.titulo}`,
      `Fase: ${t.fase}`,
      `Descripcion: ${truncateText(t.descripcion, config.maxDesc)}`,
      formatRevisionDocGeneral(doc, config.maxAnalysis),
      formatRevisionCodeGeneral(code, config.maxAnalysis),
    ].join("\n");
  });

  const maxLabel = Math.min(config.maxTasks, 25);
  return [
    `## Tareas recientes para contexto general (max ${maxLabel})`,
    bloquesTareas.length ? bloquesTareas.join("\n\n") : "(No hay tareas)",
    "",
    "## Ultimos mensajes del chat general (max 6)",
    formatHistoryBlock(history, 1500),
  ].join("\n");
}

export async function buildTaskFocusedContext(
  tareaUuid: string,
  tareasRepo: TareasRepository,
  revisionesRepo: RevisionesRepository,
  chatRepo: ChatRepository,
  config: ChatGeneralConfig = getChatGeneralConfig(),
): Promise<string> {
  const tarea = await tareasRepo.getByUuid(tareaUuid);
  if (!tarea) {
    return "(Tarea no encontrada)";
  }

  const [doc, code, history] = await Promise.all([
    revisionesRepo.getLatestByType(tareaUuid, "documental"),
    revisionesRepo.getLatestByType(tareaUuid, "codigo"),
    chatRepo.getLastMessagesForContext(null, 6),
  ]);

  const maxCode = 800;

  const ctx = [
    "## Tarea enfocada (detectada automaticamente en chat general)",
    `ID interno: ${tarea.id}`,
    `ID tarjeta: ${tarea.id_tarea}`,
    `Titulo: ${tarea.titulo}`,
    `Fase: ${tarea.fase}`,
    `Descripcion: ${truncateText(tarea.descripcion, config.focusMaxDesc)}`,
    "",
    "## Revision documental mas reciente",
    formatRevisionDocFocused(doc, config.focusMaxPdf, config.focusMaxAnalysis),
    "",
    "## Revision de codigo mas reciente",
    formatRevisionCodeFocused(code, maxCode, config.focusMaxAnalysis),
    "",
    "## Ultimos mensajes del chat general (max 6)",
    formatHistoryBlock(history, 1500),
  ].join("\n");

  return ctx;
}
