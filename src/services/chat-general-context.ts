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
  formatTaskOperationalMetadata,
  formatHistoryBlock,
  type RevisionFormatLimits,
} from "@/src/services/chat-context-assembly";
import { FASES_TABLERO, getPhaseMode, normalizePhase } from "@/src/lib/fases";
import type { ChatPromptMeta, ChatUserIntent, RevisionContext, TareaContext } from "@/src/types/chat";

export type BuiltChatContext = {
  contextText: string;
  promptMeta: ChatPromptMeta;
};

export type ChatContextBuildOptions = {
  userMessage?: string;
  intent?: ChatUserIntent;
};

type RevisionPair = {
  doc: RevisionContext | null;
  code: RevisionContext | null;
};

type BuildProjectContextResult = {
  text: string;
  anyComparative: boolean;
};

export function buildProjectContext(params: {
  tasks: TareaContext[];
  revMap: Map<string, RevisionPair>;
  totalTasksAvailable: number;
  config: ChatGeneralConfig;
  comparisonLimits: RevisionFormatLimits;
}): BuildProjectContextResult {
  const { tasks, revMap, totalTasksAvailable, config, comparisonLimits } = params;
  const loadedCount = tasks.length;
  const isPartial = totalTasksAvailable > loadedCount;
  let anyComparative = false;

  const headerLines = [
    isPartial
      ? `Actualmente tengo contexto de ${loadedCount} de ${totalTasksAvailable} tareas disponibles, por lo que el analisis puede ser parcial.`
      : `El analisis considera las ${loadedCount} tareas registradas del tablero SICOP.`,
    `Limite configurado para contexto general: ${config.maxTasks} tareas.`,
    "Las tareas se agrupan por fase y cada bloque conserva un resumen compacto para no excluir tarjetas importantes.",
  ];

  const phaseSections = FASES_TABLERO.map((phase) => {
    const phaseTasks = tasks
      .filter((task) => normalizePhase(task.fase) === phase.key)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

    if (phaseTasks.length === 0) {
      return `## ${phase.titulo}\n(Sin tareas registradas en esta fase dentro del contexto cargado.)`;
    }

    const blocks = phaseTasks.map((task) => {
      const pair = revMap.get(task.id);
      const doc = pair?.doc ?? null;
      const phaseMode = getPhaseMode(task.fase);
      const code = phaseMode === "mixto" ? (pair?.code ?? null) : null;
      const { text, hadComparativeBlock } = assembleGeneralListTaskBlock({
        tarea: task,
        doc,
        code,
        maxDesc: config.maxDesc,
        maxAnalysis: config.maxAnalysis,
        comparisonLimits,
      });
      if (hadComparativeBlock) anyComparative = true;

      return injectProjectTaskMetadata({
        text,
        task,
        doc,
        code,
      });
    });

    return [`## ${phase.titulo}`, ...blocks].join("\n\n");
  });

  const otherTasks = tasks
    .filter((task) => !FASES_TABLERO.some((phase) => normalizePhase(task.fase) === phase.key))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  if (otherTasks.length > 0) {
    const blocks = otherTasks.map((task) => {
      const pair = revMap.get(task.id);
      const doc = pair?.doc ?? null;
      const phaseMode = getPhaseMode(task.fase);
      const code = phaseMode === "mixto" ? (pair?.code ?? null) : null;
      const { text, hadComparativeBlock } = assembleGeneralListTaskBlock({
        tarea: task,
        doc,
        code,
        maxDesc: config.maxDesc,
        maxAnalysis: config.maxAnalysis,
        comparisonLimits,
      });
      if (hadComparativeBlock) anyComparative = true;

      return injectProjectTaskMetadata({
        text,
        task,
        doc,
        code,
      });
    });

    phaseSections.push(["## Otras fases", ...blocks].join("\n\n"));
  }

  return {
    text: [headerLines.join("\n"), "", ...phaseSections].join("\n"),
    anyComparative,
  };
}

function injectProjectTaskMetadata(params: {
  text: string;
  task: TareaContext;
  doc: RevisionContext | null;
  code: RevisionContext | null;
}): string {
  const { text, task, doc, code } = params;
  const [heading, ...rest] = text.split("\n");

  const metadata = [
    `ID interno: ${task.id}`,
    `ID tarjeta: ${task.id_tarea}`,
    `Titulo: ${task.titulo}`,
    `Fase: ${task.fase}`,
    ...formatTaskOperationalMetadata(task),
    `Estado de revisiones: ${formatTaskEvidenceStatus(task, doc, code)}`,
    `URL Trello: ${task.url_tarjeta?.trim() || "N/D"}`,
  ];

  return [heading, ...metadata, ...rest].join("\n");
}

function formatTaskEvidenceStatus(
  task: TareaContext,
  doc: RevisionContext | null,
  code: RevisionContext | null,
): string {
  const phaseMode = getPhaseMode(task.fase);
  const docStatus = doc ? "documental completo" : "documental pendiente";
  const codeStatus =
    phaseMode === "mixto"
      ? code
        ? "codigo completo"
        : "codigo pendiente"
      : "codigo no aplica por fase";

  return `${docStatus}; ${codeStatus}`;
}

export async function buildGeneralContext(
  tareasRepo: TareasRepository,
  revisionesRepo: RevisionesRepository,
  chatRepo: ChatRepository,
  config: ChatGeneralConfig = getChatGeneralConfig(),
  options?: ChatContextBuildOptions,
): Promise<BuiltChatContext> {
  const [tareas, totalTareasDisponibles] = await Promise.all([
    tareasRepo.getLatestForGeneralChat(config.maxTasks),
    tareasRepo.countAllForGeneralChat(),
  ]);
  const ids = tareas.map((t) => t.id);
  const revMap = await revisionesRepo.getLatestDocAndCodeForTareas(ids);
  const history = await chatRepo.getLastMessagesForContext(null, 6);

  const comparisonLimits = {
    maxPdf: 200,
    maxDocAnalysis: 450,
    maxCode: 320,
    maxCodeAnalysis: 450,
  };

  const projectContext = buildProjectContext({
    tasks: tareas,
    revMap,
    totalTasksAvailable: totalTareasDisponibles,
    config,
    comparisonLimits,
  });

  let contextText = [
    "## Contexto completo del proyecto SICOP",
    projectContext.text,
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
    comparativeActive: projectContext.anyComparative,
    generalBroad: true,
    projectTasksLoaded: tareas.length,
    projectTasksAvailable: totalTareasDisponibles,
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
