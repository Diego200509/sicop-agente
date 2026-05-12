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
import type { ChatPromptMeta, ChatQuestionKind, ChatUserIntent, RevisionContext, TareaContext } from "@/src/types/chat";

export type BuiltChatContext = {
  contextText: string;
  promptMeta: ChatPromptMeta;
};

export type ChatContextBuildOptions = {
  userMessage?: string;
  intent?: ChatUserIntent;
  questionKind?: ChatQuestionKind;
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

type TaskOperationalInsight = {
  task: TareaContext;
  doc: RevisionContext | null;
  code: RevisionContext | null;
  phaseMode: ReturnType<typeof getPhaseMode>;
  completed: boolean;
  status: "Cumplida" | "Pendiente";
  inicioLabel: string;
  finLabel: string;
  dueAt: Date | null;
  daysLate: number | null;
  daysToDue: number | null;
  missing: string[];
  priorityScore: number;
  priorityLabel: "Alta" | "Media" | "Baja";
  priorityReasons: string[];
};

function formatContextDate(value: string | null | undefined): string {
  return value?.trim() ? value : "No definido";
}

function parseTaskDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((start.getTime() - end.getTime()) / 86_400_000);
}

function escapeTableCell(value: string | null | undefined): string {
  return (value?.trim() || "N/D").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdownLink(url: string | null | undefined): string {
  const clean = url?.trim();
  return clean ? `[Trello](${clean})` : "N/D";
}

function buildOperationalInsights(
  tasks: TareaContext[],
  revMap: Map<string, RevisionPair>,
): TaskOperationalInsight[] {
  const now = new Date();

  return tasks.map((task) => {
    const pair = revMap.get(task.id);
    const doc = pair?.doc ?? null;
    const phaseMode = getPhaseMode(task.fase);
    const code = phaseMode === "mixto" ? (pair?.code ?? null) : null;
    const completed = task.completado === true || task.estado === "Cumplida";
    const status = completed ? "Cumplida" : "Pendiente";
    const dueAt = parseTaskDate(task.fin);
    const daysLate = !completed && dueAt && dueAt.getTime() < now.getTime() ? Math.max(0, daysBetween(now, dueAt)) : null;
    const daysToDue = !completed && dueAt && dueAt.getTime() >= now.getTime() ? Math.ceil((dueAt.getTime() - now.getTime()) / 86_400_000) : null;
    const missing: string[] = [];

    if (!task.inicio?.trim()) missing.push("sin fecha inicio");
    if (!task.fin?.trim()) missing.push("sin fecha fin");
    if (!task.url_tarjeta?.trim()) missing.push("sin enlace Trello");
    if (!doc) missing.push("sin revision documental");
    if (phaseMode === "mixto" && !code) missing.push("sin revision de codigo");

    let priorityScore = 0;
    const priorityReasons: string[] = [];

    if (!completed) {
      priorityScore += 10;
      priorityReasons.push("pendiente");
    }
    if (daysLate != null) {
      priorityScore += 60 + Math.min(20, daysLate);
      priorityReasons.push(`vencida hace ${daysLate} dia(s)`);
    } else if (daysToDue != null && daysToDue <= 3) {
      priorityScore += 30;
      priorityReasons.push(`vence en ${daysToDue} dia(s)`);
    }
    if (!task.fin?.trim()) {
      priorityScore += completed ? 4 : 22;
      priorityReasons.push("sin fecha fin");
    }
    if (!doc) {
      priorityScore += 18;
      priorityReasons.push("sin revision documental");
    }
    if (phaseMode === "mixto" && !code) {
      priorityScore += 18;
      priorityReasons.push("sin revision de codigo");
    }
    if (!task.url_tarjeta?.trim()) {
      priorityScore += 6;
      priorityReasons.push("sin enlace Trello");
    }
    if (normalizePhase(task.fase).includes("desarrollo") || normalizePhase(task.fase).includes("seguimiento")) {
      priorityScore += 6;
      priorityReasons.push("fase sensible");
    }

    const priorityLabel = priorityScore >= 65 ? "Alta" : priorityScore >= 30 ? "Media" : "Baja";

    return {
      task,
      doc,
      code,
      phaseMode,
      completed,
      status,
      inicioLabel: formatContextDate(task.inicio),
      finLabel: formatContextDate(task.fin),
      dueAt,
      daysLate,
      daysToDue,
      missing,
      priorityScore,
      priorityLabel,
      priorityReasons,
    };
  });
}

function summarizeOperationalMetrics(insights: TaskOperationalInsight[]): string[] {
  const total = insights.length;
  const completed = insights.filter((i) => i.completed).length;
  const pending = total - completed;
  const withoutInicio = insights.filter((i) => !i.task.inicio?.trim()).length;
  const withoutFin = insights.filter((i) => !i.task.fin?.trim()).length;
  const withoutUrl = insights.filter((i) => !i.task.url_tarjeta?.trim()).length;
  const withoutDoc = insights.filter((i) => !i.doc).length;
  const withoutCode = insights.filter((i) => i.phaseMode === "mixto" && !i.code).length;
  const overdue = insights.filter((i) => i.daysLate != null).length;
  const dueSoon = insights.filter((i) => i.daysToDue != null && i.daysToDue <= 3).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return [
    `Total de tareas cargadas: ${total}`,
    `Avance operativo: ${completed}/${total} cumplidas (${progress}%).`,
    `Pendientes: ${pending}.`,
    `Tareas atrasadas: ${overdue}.`,
    `Tareas que vencen en 3 dias o menos: ${dueSoon}.`,
    `Tareas sin fecha inicio: ${withoutInicio}.`,
    `Tareas sin fecha fin: ${withoutFin}.`,
    `Tareas sin enlace Trello: ${withoutUrl}.`,
    `Tareas sin revision documental: ${withoutDoc}.`,
    `Tareas mixtas sin revision de codigo: ${withoutCode}.`,
    "Responsables: no hay campo de responsable disponible en el esquema actual.",
  ];
}

function taskTableRows(insights: TaskOperationalInsight[]): string[] {
  return insights.map((i) =>
    [
      escapeTableCell(i.task.titulo),
      escapeTableCell(i.task.fase),
      i.status,
      escapeTableCell(i.finLabel),
      markdownLink(i.task.url_tarjeta),
    ].join(" | "),
  );
}

function formatTaskTable(insights: TaskOperationalInsight[]): string {
  return [
    "Tarea | Fase | Estado | Fecha fin | Enlace",
    "--- | --- | --- | --- | ---",
    ...taskTableRows(insights),
  ].join("\n");
}

function formatPriorityLine(i: TaskOperationalInsight): string {
  const reasons = i.priorityReasons.length > 0 ? i.priorityReasons.join("; ") : "sin alertas fuertes";
  return `- ${i.priorityLabel} (${i.priorityScore}): ${i.task.titulo} | Fase: ${i.task.fase} | Estado: ${i.status} | Fin: ${i.finLabel} | Motivos: ${reasons} | Enlace: ${i.task.url_tarjeta?.trim() || "N/D"}`;
}

function buildMissingDataBlock(insights: TaskOperationalInsight[]): string {
  const categories: Array<[string, (i: TaskOperationalInsight) => boolean]> = [
    ["Sin fecha inicio", (i) => !i.task.inicio?.trim()],
    ["Sin fecha fin", (i) => !i.task.fin?.trim()],
    ["Sin enlace Trello", (i) => !i.task.url_tarjeta?.trim()],
    ["Sin revision documental", (i) => !i.doc],
    ["Mixtas sin revision de codigo", (i) => i.phaseMode === "mixto" && !i.code],
  ];

  const blocks = categories.map(([title, predicate]) => {
    const matches = insights.filter(predicate);
    const rows =
      matches.length === 0
        ? ["- Ninguna."]
        : matches.map((i) => `- ${i.task.titulo} | Fase: ${i.task.fase} | Estado: ${i.status} | Fin: ${i.finLabel}`);
    return [`### ${title} (${matches.length})`, ...rows].join("\n");
  });

  return ["## Datos incompletos detectados", ...blocks].join("\n\n");
}

function buildOverdueBlock(insights: TaskOperationalInsight[]): string {
  const overdue = insights
    .filter((i) => i.daysLate != null)
    .sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0));
  const noDueDate = insights.filter((i) => !i.completed && !i.task.fin?.trim());

  return [
    "## Tareas atrasadas y sin fecha fin",
    overdue.length === 0
      ? "No hay tareas vencidas segun la fecha fin registrada."
      : [
          "### Vencidas",
          "Tarea | Fase | Estado | Fecha fin | Dias atraso | Enlace",
          "--- | --- | --- | --- | --- | ---",
          ...overdue.map((i) =>
            [
              escapeTableCell(i.task.titulo),
              escapeTableCell(i.task.fase),
              i.status,
              escapeTableCell(i.finLabel),
              String(i.daysLate ?? 0),
              markdownLink(i.task.url_tarjeta),
            ].join(" | "),
          ),
        ].join("\n"),
    noDueDate.length === 0
      ? "### Pendientes sin fecha fin\n- Ninguna."
      : ["### Pendientes sin fecha fin", ...noDueDate.map(formatPriorityLine)].join("\n"),
  ].join("\n\n");
}

function buildRiskBlock(insights: TaskOperationalInsight[]): string {
  const ranked = [...insights].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 12);
  const analysisHints = ranked
    .map((i) => {
      const doc = i.doc?.analisis_documental?.trim();
      const code = i.code?.analisis_codigo?.trim();
      const hints = [doc ? `Doc: ${doc.slice(0, 360)}` : null, code ? `Codigo: ${code.slice(0, 360)}` : null].filter(Boolean);
      return hints.length > 0 ? `- ${i.task.titulo}: ${hints.join(" | ")}` : null;
    })
    .filter(Boolean);

  return [
    "## Riesgos priorizados",
    ...ranked.map(formatPriorityLine),
    "",
    "## Evidencia breve desde revisiones para riesgos",
    analysisHints.length > 0 ? analysisHints.join("\n") : "- No hay analisis documental/codigo suficiente en las tareas priorizadas.",
  ].join("\n");
}

function buildFocusedContextByQuestionKind(params: {
  questionKind: ChatQuestionKind;
  tasks: TareaContext[];
  revMap: Map<string, RevisionPair>;
  totalTasksAvailable: number;
  config: ChatGeneralConfig;
}): string {
  const { questionKind, tasks, revMap, totalTasksAvailable, config } = params;
  const insights = buildOperationalInsights(tasks, revMap);
  const sortedByPhase = [...insights].sort((a, b) => {
    const phase = normalizePhase(a.task.fase).localeCompare(normalizePhase(b.task.fase), "es");
    return phase !== 0 ? phase : a.task.titulo.localeCompare(b.task.titulo, "es");
  });
  const ranked = [...insights].sort((a, b) => b.priorityScore - a.priorityScore);
  const isPartial = totalTasksAvailable > tasks.length;

  const base = [
    "## Contexto operativo enfocado del proyecto SICOP",
    isPartial
      ? `Contexto cargado: ${tasks.length} de ${totalTasksAvailable} tareas disponibles.`
      : `Contexto cargado: ${tasks.length} tareas registradas.`,
    `Limite configurado para contexto general: ${config.maxTasks} tareas.`,
    "",
    "## Metricas operativas",
    ...summarizeOperationalMetrics(insights).map((line) => `- ${line}`),
  ];

  if (questionKind === "task_list") {
    return [...base, "", "## Lista completa de tareas cargadas", formatTaskTable(sortedByPhase)].join("\n");
  }

  if (questionKind === "overdue") {
    return [...base, "", buildOverdueBlock(insights), "", "## Ranking de criticidad", ...ranked.slice(0, 10).map(formatPriorityLine)].join("\n");
  }

  if (questionKind === "missing_work") {
    const byPhase = FASES_TABLERO.map((phase) => {
      const pending = sortedByPhase.filter((i) => normalizePhase(i.task.fase) === phase.key && !i.completed);
      const rows = pending.length > 0 ? pending.map(formatPriorityLine) : ["- Ninguna pendiente en esta fase."];
      return [`### ${phase.titulo}`, ...rows].join("\n");
    });
    return [...base, "", buildMissingDataBlock(insights), "", "## Pendientes agrupados por fase", ...byPhase].join("\n\n");
  }

  if (questionKind === "risks") {
    return [...base, "", buildRiskBlock(insights), "", buildMissingDataBlock(insights)].join("\n");
  }

  if (questionKind === "priority_ranking") {
    return [...base, "", "## Ranking de prioridad", ...ranked.map(formatPriorityLine)].join("\n");
  }

  if (questionKind === "executive_summary") {
    return [
      ...base,
      "",
      "## Insumos para resumen ejecutivo",
      "Usar estas secciones obligatorias en la respuesta: avance general, tareas criticas, bloqueos, proximos pasos y recomendaciones.",
      "",
      "## Tareas criticas",
      ...ranked.slice(0, 8).map(formatPriorityLine),
      "",
      buildOverdueBlock(insights),
      "",
      buildMissingDataBlock(insights),
    ].join("\n");
  }

  if (questionKind === "project_status") {
    return [
      ...base,
      "",
      "## Avance por fase",
      ...FASES_TABLERO.map((phase) => {
        const phaseItems = sortedByPhase.filter((i) => normalizePhase(i.task.fase) === phase.key);
        const done = phaseItems.filter((i) => i.completed).length;
        const rows = phaseItems.length > 0 ? phaseItems.map((i) => `- ${i.task.titulo} | ${i.status} | Fin: ${i.finLabel}`) : ["- Sin tareas."];
        return [`### ${phase.titulo}: ${done}/${phaseItems.length} cumplidas`, ...rows].join("\n");
      }),
      "",
      "## Riesgos y proximos focos",
      ...ranked.slice(0, 8).map(formatPriorityLine),
      "",
      buildMissingDataBlock(insights),
    ].join("\n");
  }

  return [...base, "", "## Lista base", formatTaskTable(sortedByPhase), "", "## Ranking de prioridad", ...ranked.slice(0, 10).map(formatPriorityLine)].join("\n");
}

function hasAnyComparativeContext(tasks: TareaContext[], revMap: Map<string, RevisionPair>): boolean {
  return tasks.some((task) => {
    const pair = revMap.get(task.id);
    return getPhaseMode(task.fase) === "mixto" && Boolean(pair?.doc && pair?.code);
  });
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

  const questionKind = options?.questionKind ?? "general";
  const useFocusedOperationalContext = questionKind !== "general";
  const projectContext = useFocusedOperationalContext
    ? {
        text: buildFocusedContextByQuestionKind({
          questionKind,
          tasks: tareas,
          revMap,
          totalTasksAvailable: totalTareasDisponibles,
          config,
        }),
        anyComparative: hasAnyComparativeContext(tareas, revMap),
      }
    : buildProjectContext({
        tasks: tareas,
        revMap,
        totalTasksAvailable: totalTareasDisponibles,
        config,
        comparisonLimits,
      });

  let contextText = [
    useFocusedOperationalContext
      ? "## Contexto seleccionado por intencion del usuario"
      : "## Contexto completo del proyecto SICOP",
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
    questionKind,
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
      questionKind: options?.questionKind ?? "general",
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
