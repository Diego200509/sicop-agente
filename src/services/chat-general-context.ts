import type { ChatRepository } from "@/src/repositories/chat.repository";
import type { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import type { TareasRepository } from "@/src/repositories/tareas.repository";
import { getChatGeneralConfig, type ChatGeneralConfig } from "@/src/lib/chat-general-config";
import {
  buildCrossTaskDocumentEvidenceBlock,
  buildPrimarySectionCitation,
  classifyDocumentQuestion,
  findRelevantDocumentSections,
  parseDocumentSections,
  shouldAttemptCrossTaskDocumentEvidence,
  type DocumentPrimaryCitation,
  type DocumentSection,
} from "@/src/lib/document-sections";
import {
  assembleGeneralListTaskBlock,
  assembleSingleTaskModelContext,
  formatHistoryBlock,
} from "@/src/services/chat-context-assembly";
import { getPhaseMode } from "@/src/lib/fases";
import type { ChatPromptMeta, ChatUserIntent } from "@/src/types/chat";

export type BuiltChatContext = {
  contextText: string;
  promptMeta: ChatPromptMeta;
};

export type ChatContextBuildOptions = {
  userMessage?: string;
  intent?: ChatUserIntent;
};

export async function buildGeneralContext(
  tareasRepo: TareasRepository,
  revisionesRepo: RevisionesRepository,
  chatRepo: ChatRepository,
  config: ChatGeneralConfig = getChatGeneralConfig(),
  options?: ChatContextBuildOptions,
): Promise<BuiltChatContext> {
  const tareas = await tareasRepo.getLatestForGeneralChat(config.maxTasks);
  const ids = tareas.map((t) => t.id);
  const revMap = await revisionesRepo.getLatestDocAndCodeForTareas(ids);
  const history = await chatRepo.getLastMessagesForContext(null, 6);

  const comparisonLimits = {
    maxPdf: 200,
    maxDocAnalysis: 450,
    maxCode: 320,
    maxCodeAnalysis: 450,
  };

  let anyComparative = false;
  const bloquesTareas = tareas.map((t) => {
    const pair = revMap.get(t.id);
    const doc = pair?.doc ?? null;
    const phaseMode = getPhaseMode(t.fase);
    const code = phaseMode === "mixto" ? (pair?.code ?? null) : null;
    const { text, hadComparativeBlock } = assembleGeneralListTaskBlock({
      tarea: t,
      doc,
      code,
      maxDesc: config.maxDesc,
      maxAnalysis: config.maxAnalysis,
      comparisonLimits,
    });
    if (hadComparativeBlock) anyComparative = true;
    return text;
  });

  const maxLabel = Math.min(config.maxTasks, 25);
  let contextText = [
    `## Tareas recientes para contexto general (max ${maxLabel})`,
    bloquesTareas.length ? bloquesTareas.join("\n\n") : "(No hay tareas)",
    "",
    "## Ultimos mensajes del chat general (max 6)",
    formatHistoryBlock(history, 1500),
  ].join("\n");

  let documentEvidenceActive = false;
  let documentEvidenceCount = 0;
  let crossPrimaryCitation: DocumentPrimaryCitation | undefined;

  if (
    options?.userMessage?.trim() &&
    options?.intent &&
    shouldAttemptCrossTaskDocumentEvidence(options.userMessage, options.intent)
  ) {
    const items: Array<{ tareaLabel: string; sections: DocumentSection[]; hints: string[] }> = [];
    for (const t of tareas.slice(0, 6)) {
      const doc = revMap.get(t.id)?.doc;
      if (!doc?.texto_pdf?.trim()) continue;
      const secs = parseDocumentSections(doc.texto_pdf);
      const { sections: picked } = findRelevantDocumentSections(options.userMessage, secs, {
        maxSections: 1,
        maxCharsPerSection: 680,
        maxTotalChars: 720,
        minScore: 24,
      });
      if (picked.length > 0) {
        items.push({ tareaLabel: `${t.id_tarea} — ${t.titulo}`, sections: picked, hints: [] });
      }
      if (items.length >= 3) break;
    }
    const cross = buildCrossTaskDocumentEvidenceBlock(items, 3400);
    if (cross) {
      contextText = `${contextText}\n\n${cross}`;
      documentEvidenceActive = true;
      documentEvidenceCount = items.length;
      const firstSec = items[0]?.sections[0];
      if (firstSec) {
        crossPrimaryCitation = buildPrimarySectionCitation(firstSec);
      }
    }
  }

  const promptMeta: ChatPromptMeta = {
    phaseMode: null,
    comparativeActive: anyComparative,
    generalBroad: true,
    documentEvidenceActive,
    documentEvidenceCount,
    ...(crossPrimaryCitation
      ? {
          documentPrimarySectionLabel: crossPrimaryCitation.label,
          documentPrimarySectionTitle: crossPrimaryCitation.title,
          documentPrimarySectionRef: crossPrimaryCitation.ref,
        }
      : {}),
  };
  if (options?.userMessage?.trim() && options.intent) {
    promptMeta.documentQuestionType = classifyDocumentQuestion(options.userMessage, options.intent);
  }

  return { contextText, promptMeta };
}

export async function buildTaskFocusedContext(
  tareaUuid: string,
  tareasRepo: TareasRepository,
  revisionesRepo: RevisionesRepository,
  chatRepo: ChatRepository,
  config: ChatGeneralConfig = getChatGeneralConfig(),
  options?: ChatContextBuildOptions,
): Promise<BuiltChatContext> {
  const tarea = await tareasRepo.getByUuid(tareaUuid);
  if (!tarea) {
    return {
      contextText: "(Tarea no encontrada)",
      promptMeta: { phaseMode: null, comparativeActive: false, generalBroad: false },
    };
  }

  const phaseMode = getPhaseMode(tarea.fase);
  const maxCode = 800;
  const limits = {
    maxPdf: config.focusMaxPdf,
    maxDocAnalysis: config.focusMaxAnalysis,
    maxCode,
    maxCodeAnalysis: config.focusMaxAnalysis,
  };

  const [doc, code, history] = await Promise.all([
    revisionesRepo.getLatestByType(tareaUuid, "documental"),
    phaseMode === "mixto" ? revisionesRepo.getLatestByType(tareaUuid, "codigo") : Promise.resolve(null),
    chatRepo.getLastMessagesForContext(null, 6),
  ]);

  const assembled = assembleSingleTaskModelContext({
    variant: "general_focused",
    tarea,
    doc,
    code,
    history,
    limits,
    maxDesc: config.focusMaxDesc,
    maxHistoryMsg: 1500,
    userMessage: options?.userMessage,
    intent: options?.intent,
  });

  return {
    contextText: assembled.text,
    promptMeta: {
      phaseMode: assembled.phaseMode,
      comparativeActive: assembled.comparativeActive,
      codePrEvidenceActive: assembled.codePrEvidenceActive,
      generalBroad: false,
      documentEvidenceActive: assembled.documentEvidenceActive,
      documentEvidenceCount: assembled.documentEvidenceCount,
      documentQuestionType: assembled.documentQuestionType,
      ...(assembled.documentPrimaryCitation
        ? {
            documentPrimarySectionLabel: assembled.documentPrimaryCitation.label,
            documentPrimarySectionTitle: assembled.documentPrimaryCitation.title,
            documentPrimarySectionRef: assembled.documentPrimaryCitation.ref,
          }
        : {}),
    },
  };
}
