import {
  extractDocumentEvidenceForQuestion,
  type DocumentPrimaryCitation,
  type DocumentQuestionType,
} from "@/src/lib/document-sections";
import { getPhaseMode, type PhaseMode } from "@/src/lib/fases";
import { truncateText } from "@/src/lib/chat-text";
import type { ChatUserIntent, RevisionContext, TareaContext } from "@/src/types/chat";

export type RevisionFormatLimits = {
  maxPdf: number;
  maxDocAnalysis: number;
  maxCode: number;
  maxCodeAnalysis: number;
};

export function shouldActivateComparativeBlock(
  phaseMode: PhaseMode,
  doc: RevisionContext | null,
  code: RevisionContext | null,
): boolean {
  return phaseMode === "mixto" && doc != null && code != null;
}

export function formatRevisionDocumentalDetail(
  r: RevisionContext | null,
  limits: Pick<RevisionFormatLimits, "maxPdf" | "maxDocAnalysis">,
): string {
  if (!r) return "(Sin revision documental registrada)";
  const pdfPart =
    limits.maxPdf > 0
      ? `Texto PDF (extracto): ${truncateText(r.texto_pdf, limits.maxPdf)}`
      : "(Texto PDF omitido)";
  return [
    `Fecha: ${r.fecha_revision ?? "N/D"}`,
    pdfPart,
    `Analisis documental: ${truncateText(r.analisis_documental, limits.maxDocAnalysis)}`,
  ].join("\n");
}

export function formatRevisionCodigoDetail(
  r: RevisionContext | null,
  limits: Pick<RevisionFormatLimits, "maxCode" | "maxCodeAnalysis">,
): string {
  if (!r) return "(Sin revision de codigo registrada)";
  const repo = [r.repo_owner, r.repo_name].filter(Boolean).join("/");
  return [
    `Fecha: ${r.fecha_revision ?? "N/D"}`,
    `PR: ${r.pr_title ?? "N/D"} | Repo: ${repo || "N/D"}`,
    `Codigo PR (extracto): ${truncateText(r.codigo_pr, limits.maxCode)}`,
    `Analisis codigo: ${truncateText(r.analisis_codigo, limits.maxCodeAnalysis)}`,
  ].join("\n");
}

export function formatRevisionDocumentalGeneral(r: RevisionContext | null, maxAnalysis: number): string {
  if (!r) return "(Sin revision documental registrada)";
  return [
    `Fecha ultima revision documental: ${r.fecha_revision ?? "N/D"}`,
    `Analisis documental (extracto): ${truncateText(r.analisis_documental, maxAnalysis) || "(sin analisis)"}`,
  ].join("\n");
}

export function formatRevisionCodigoGeneral(r: RevisionContext | null, maxAnalysis: number): string {
  if (!r) return "(Sin revision de codigo registrada)";
  const repo = [r.repo_owner, r.repo_name].filter(Boolean).join("/");
  return [
    `Fecha ultima revision codigo: ${r.fecha_revision ?? "N/D"}`,
    `PR: ${r.pr_title ?? "N/D"} | Repo: ${repo || "N/D"}`,
    `Analisis codigo (extracto): ${truncateText(r.analisis_codigo, maxAnalysis) || "(sin analisis)"}`,
  ].join("\n");
}

/**
 * Bloque comparativo explícito (solo como insumo de contexto; la respuesta sigue el system prompt).
 * Requiere fase mixta y ambas revisiones; no llamar si falta alguna.
 */
export function buildTaskComparisonBlock(
  tarea: TareaContext,
  doc: RevisionContext,
  code: RevisionContext,
  limits: RevisionFormatLimits,
): string {
  const docPdf = truncateText(doc.texto_pdf, limits.maxPdf);
  const docAn = truncateText(doc.analisis_documental, limits.maxDocAnalysis);
  const codeDiff = truncateText(code.codigo_pr, limits.maxCode);
  const codeAn = truncateText(code.analisis_codigo, limits.maxCodeAnalysis);
  const repo = [code.repo_owner, code.repo_name].filter(Boolean).join("/");

  return [
    "## Modo comparativo documentacion vs codigo (activado por el sistema)",
    `Tarea: ${tarea.id_tarea} — ${tarea.titulo} | Fase: ${tarea.fase}`,
    "",
    "El sistema ha incluido este bloque porque la tarea esta en fase mixta y existen revision documental y revision de codigo.",
    "Usa la informacion de las secciones de revision (y los extractos siguientes) para razonar de forma explicita; no inventes requisitos que no aparezcan en el contexto.",
    "",
    "### Qué describe o exige la documentacion (insumo concentrado)",
    `- Analisis documental (extracto): ${docAn || "(sin texto util en extracto)"}`,
    `- Texto PDF (extracto): ${docPdf || "(sin texto util en extracto)"}`,
    "",
    "### Qué evidencia existe en el codigo / PR (insumo concentrado)",
    `- PR: ${code.pr_title ?? "N/D"} | Repo: ${repo || "N/D"}`,
    `- Analisis de codigo (extracto): ${codeAn || "(sin texto util en extracto)"}`,
    `- Codigo PR / diff (extracto): ${codeDiff || "(sin texto util en extracto)"}`,
    "",
    "### Lineas guia para tu razonamiento comparativo",
    "1. Coincidencias: donde el comportamiento o requisitos descritos alinean con la evidencia de implementacion.",
    "2. Diferencias o faltantes: brechas, omisiones o desalineaciones respecto al documento.",
    "3. Conclusion comparativa: sintesis prudente basada solo en estos insumos (si falta evidencia, dilo).",
  ].join("\n");
}

export type TaskContextVariant = "tarea_thread" | "general_focused";

export type AssembledSingleTaskContext = {
  text: string;
  phaseMode: PhaseMode;
  comparativeActive: boolean;
  documentEvidenceActive: boolean;
  documentEvidenceCount: number;
  documentQuestionType: DocumentQuestionType;
  documentPrimaryCitation?: DocumentPrimaryCitation;
};

export function formatHistoryBlock(
  messages: Array<{ rol: string; mensaje: string }>,
  maxMsg: number,
): string {
  if (messages.length === 0) return "(Sin mensajes previos en este hilo)";
  return messages
    .map((m) => `${m.rol === "user" ? "Usuario" : "Asistente"}: ${truncateText(m.mensaje, maxMsg)}`)
    .join("\n");
}

export function assembleSingleTaskModelContext(params: {
  variant: TaskContextVariant;
  tarea: TareaContext;
  doc: RevisionContext | null;
  /** En fase documental debe ser null (no se consulta en BD). */
  code: RevisionContext | null;
  history: Array<{ rol: string; mensaje: string }>;
  limits: RevisionFormatLimits;
  maxDesc: number;
  maxHistoryMsg: number;
  userMessage?: string | null;
  intent?: ChatUserIntent;
}): AssembledSingleTaskContext {
  const { variant, tarea, doc, code, history, limits, maxDesc, maxHistoryMsg, userMessage, intent } = params;
  const phaseMode = getPhaseMode(tarea.fase);

  const header =
    variant === "tarea_thread"
      ? ["## Tarea"]
      : ["## Tarea enfocada (detectada automaticamente en chat general)"];

  const lines: string[] = [
    ...header,
    `ID interno: ${tarea.id}`,
    `ID tarjeta: ${tarea.id_tarea}`,
    `Titulo: ${tarea.titulo}`,
    `Fase: ${tarea.fase}`,
    `Modo de contexto segun fase: ${phaseMode === "mixto" ? "mixto (documental + codigo)" : "documental (solo documentacion)"}`,
    `Descripcion: ${truncateText(tarea.descripcion, maxDesc)}`,
    "",
    "## Revision documental mas reciente",
    formatRevisionDocumentalDetail(doc, limits),
  ];

  let comparativeActive = false;
  let documentEvidenceActive = false;
  let documentEvidenceCount = 0;
  let documentQuestionType: DocumentQuestionType = "none";
  let documentPrimaryCitation: DocumentPrimaryCitation | undefined;

  if (userMessage?.trim() && intent) {
    const ev = extractDocumentEvidenceForQuestion(userMessage, intent, doc?.texto_pdf, {
      maxSections: 3,
      maxCharsPerSection: variant === "tarea_thread" ? 3200 : 2800,
      maxTotalChars: 6200,
      minScore: 16,
    });
    documentQuestionType = ev.questionType;
    if (ev.block) {
      lines.push("", ev.block);
      documentEvidenceActive = true;
      documentEvidenceCount = ev.count;
      documentPrimaryCitation = ev.primaryCitation;
    }
  }

  if (phaseMode === "mixto") {
    lines.push("", "## Revision de codigo mas reciente", formatRevisionCodigoDetail(code, limits));
    if (shouldActivateComparativeBlock(phaseMode, doc, code)) {
      lines.push("", buildTaskComparisonBlock(tarea, doc!, code!, limits));
      comparativeActive = true;
    }
  } else {
    lines.push(
      "",
      "## Alcance por fase",
      "Esta tarea esta en fase documental (o la fase no requiere revision de codigo): el contexto NO incluye PR, diff, analisis de codigo ni extractos de codigo.",
    );
  }

  const historyTitle =
    variant === "tarea_thread"
      ? "## Ultimos mensajes del chat de esta tarea (max 6)"
      : "## Ultimos mensajes del chat general (max 6)";

  lines.push("", historyTitle, formatHistoryBlock(history, maxHistoryMsg));

  return {
    text: lines.join("\n"),
    phaseMode,
    comparativeActive,
    documentEvidenceActive,
    documentEvidenceCount,
    documentQuestionType,
    documentPrimaryCitation,
  };
}

/**
 * Un bloque de tarea para el contexto general (lista de tareas recientes).
 */
export function assembleGeneralListTaskBlock(params: {
  tarea: TareaContext;
  doc: RevisionContext | null;
  code: RevisionContext | null;
  maxDesc: number;
  maxAnalysis: number;
  /** Limites mas bajos para el sub-bloque comparativo dentro de listas. */
  comparisonLimits: RevisionFormatLimits;
}): { text: string; hadComparativeBlock: boolean } {
  const { tarea, doc, code, maxDesc, maxAnalysis, comparisonLimits } = params;
  const phaseMode = getPhaseMode(tarea.fase);

  const parts: string[] = [
    `### ${tarea.id_tarea} — ${tarea.titulo}`,
    `Fase: ${tarea.fase}`,
    `Modo de contexto segun fase: ${phaseMode === "mixto" ? "mixto" : "documental"}`,
    `Descripcion: ${truncateText(tarea.descripcion, maxDesc)}`,
    formatRevisionDocumentalGeneral(doc, maxAnalysis),
  ];

  let hadComparativeBlock = false;

  if (phaseMode === "mixto") {
    parts.push(formatRevisionCodigoGeneral(code, maxAnalysis));
    if (shouldActivateComparativeBlock(phaseMode, doc, code)) {
      parts.push("", buildTaskComparisonBlock(tarea, doc!, code!, comparisonLimits));
      hadComparativeBlock = true;
    }
  } else {
    parts.push(
      "(Revision de codigo: no incluida en el contexto por fase documental — no asumas datos de PR ni de codigo para esta tarea.)",
    );
  }

  return { text: parts.join("\n"), hadComparativeBlock };
}
