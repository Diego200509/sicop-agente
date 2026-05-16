import OpenAI from "openai";

import { getPhaseMode } from "@/src/lib/fases";
import { getChatGeneralConfig } from "@/src/lib/chat-general-config";
import { ChatRepository } from "@/src/repositories/chat.repository";
import { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import { TareasRepository } from "@/src/repositories/tareas.repository";
import { assembleSingleTaskModelContext } from "@/src/services/chat-context-assembly";
import { buildGeneralContext, buildTaskFocusedContext } from "@/src/services/chat-general-context";
import { resolveGeneralTaskFromMessage } from "@/src/services/chat-general-resolution";
import {
  answerActiveTasksQuestion,
  answerTaskStatusReportQuestion,
  isActiveTasksQuestion,
  isTaskStatusClassificationQuestion,
} from "@/src/services/chat-active-tasks";
import { detectQuestionKind, detectUserIntent } from "@/src/lib/chat-user-intent";
import { buildChatSystemPrompt } from "@/src/services/chat-system-prompt";
import { getLatestSeguimientoReport } from "@/src/services/reportesSeguimientoService";
import type { ChatContext, ChatPromptMeta, ChatQuestionKind, ChatResponse, ChatUserIntent } from "@/src/types/chat";

const DEFAULT_PROMPT_META: ChatPromptMeta = {
  phaseMode: null,
  comparativeActive: false,
  generalBroad: true,
  questionKind: "general",
};

export class ChatService {
  private openai: OpenAI;

  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly tareasRepo: TareasRepository,
    private readonly revisionesRepo: RevisionesRepository,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Falta OPENAI_API_KEY en variables de entorno");
    }
    this.openai = new OpenAI({ apiKey });
  }

  private model(): string {
    return process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  }

  async buildContext(
    tareaUuid: string | null,
    opts?: { userMessage?: string; intent?: ChatUserIntent; questionKind?: ChatQuestionKind },
  ): Promise<ChatContext> {
    if (tareaUuid) {
      const tarea = await this.tareasRepo.getByUuid(tareaUuid);
      if (!tarea) {
        return {
          mode: "tarea",
          contextText: "(Tarea no encontrada)",
          promptMeta: { phaseMode: null, comparativeActive: false, generalBroad: false },
        };
      }

      const phaseMode = getPhaseMode(tarea.fase);
      const config = getChatGeneralConfig();
      const maxCode = 800;
      const limits = {
        maxPdf: config.focusMaxPdf,
        maxDocAnalysis: config.focusMaxAnalysis,
        maxCode,
        maxCodeAnalysis: config.focusMaxAnalysis,
      };

      const [doc, code, history, latestReport] = await Promise.all([
        this.revisionesRepo.getLatestByType(tareaUuid, "documental"),
        phaseMode === "mixto" ? this.revisionesRepo.getLatestByType(tareaUuid, "codigo") : Promise.resolve(null),
        this.chatRepo.getLastMessagesForContext(tareaUuid, 6),
        getLatestSeguimientoReport(),
      ]);

      const assembled = assembleSingleTaskModelContext({
        variant: "tarea_thread",
        tarea,
        doc,
        code,
        history,
        limits,
        maxDesc: 2000,
        maxHistoryMsg: 1500,
        userMessage: opts?.userMessage,
        intent: opts?.intent,
        latestReport,
      });

      return {
        mode: "tarea",
        contextText: assembled.text,
        promptMeta: {
          phaseMode: assembled.phaseMode,
          comparativeActive: assembled.comparativeActive,
          codePrEvidenceActive: assembled.codePrEvidenceActive,
          generalBroad: false,
          questionKind: opts?.questionKind ?? "general",
          latestReportAvailable: Boolean(latestReport),
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

    const config = getChatGeneralConfig();
    const { contextText, promptMeta } = await buildGeneralContext(
      this.tareasRepo,
      this.revisionesRepo,
      this.chatRepo,
      config,
      opts,
    );
    return { mode: "general", contextText, promptMeta };
  }

  async sendMessage(userMessage: string, tareaUuid: string | null): Promise<ChatResponse> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      throw new Error("Mensaje vacio");
    }

    await this.chatRepo.insertMessage({ tareaId: tareaUuid, rol: "user", mensaje: trimmed });

    const intent = detectUserIntent(trimmed);
    const questionKind = detectQuestionKind(trimmed);
    const contextOpts = { userMessage: trimmed, intent, questionKind };

    let contextText: string;
    let promptMeta: ChatPromptMeta = DEFAULT_PROMPT_META;

    if (!tareaUuid && isTaskStatusClassificationQuestion(trimmed)) {
      const reply = await answerTaskStatusReportQuestion(trimmed, this.tareasRepo);
      const saved = await this.chatRepo.insertMessage({
        tareaId: null,
        rol: "assistant",
        mensaje: reply,
      });

      return { reply, messageIdAssistant: saved.id };
    }

    if (!tareaUuid && isActiveTasksQuestion(trimmed)) {
      const reply = await answerActiveTasksQuestion(this.tareasRepo);
      const saved = await this.chatRepo.insertMessage({
        tareaId: null,
        rol: "assistant",
        mensaje: reply,
      });

      return { reply, messageIdAssistant: saved.id };
    }

    if (tareaUuid) {
      const built = await this.buildContext(tareaUuid, contextOpts);
      contextText = built.contextText;
      promptMeta = built.promptMeta ?? DEFAULT_PROMPT_META;
    } else {
      const config = getChatGeneralConfig();
      const pool = await this.tareasRepo.listForMatching(config.matchingPool);
      const matchTasks = pool.map((t) => ({
        id: t.id,
        id_tarea: t.id_tarea,
        titulo: t.titulo,
        fase: t.fase,
        descripcion: t.descripcion,
        url_tarjeta: t.url_tarjeta,
      }));
      const forceGeneralContext =
        questionKind === "task_list" ||
        questionKind === "project_status" ||
        questionKind === "overdue" ||
        questionKind === "executive_summary" ||
        questionKind === "priority_ranking" ||
        questionKind === "latest_report" ||
        questionKind === "kpis" ||
        questionKind === "task_status_counts";

      const resolution = forceGeneralContext
        ? ({ kind: "none" } as const)
        : await resolveGeneralTaskFromMessage({
            userMessage: trimmed,
            tasks: matchTasks,
            openai: this.openai,
            model: this.model(),
          });

      if (resolution.kind === "ambiguous") {
        const lines = resolution.titles.map((t) => `- ${t}`).join("\n");
        const reply =
          `No tengo claro a qué tarea te refieres. ¿Podrías aclarar si es alguna de estas?\n\n${lines}\n\n` +
          `En el siguiente mensaje puedes indicar el titulo exacto o el ID de la tarjeta.`;

        const saved = await this.chatRepo.insertMessage({
          tareaId: null,
          rol: "assistant",
          mensaje: reply,
        });

        return { reply, messageIdAssistant: saved.id };
      }

      if (resolution.kind === "single") {
        const built = await buildTaskFocusedContext(
          resolution.taskId,
          this.tareasRepo,
          this.revisionesRepo,
          this.chatRepo,
          config,
          contextOpts,
        );
        contextText = built.contextText;
        promptMeta = built.promptMeta;
      } else {
        const built = await buildGeneralContext(
          this.tareasRepo,
          this.revisionesRepo,
          this.chatRepo,
          config,
          contextOpts,
        );
        contextText = built.contextText;
        promptMeta = built.promptMeta;
      }
    }

    const systemPrompt = buildChatSystemPrompt({ ...promptMeta, intent });

    const completion = await this.openai.chat.completions.create({
      model: this.model(),
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Contexto del sistema (no inventes datos fuera de esto):\n\n${contextText}\n\n---\n\nPregunta del usuario:\n${trimmed}`,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      throw new Error("Respuesta vacia del modelo");
    }

    const saved = await this.chatRepo.insertMessage({
      tareaId: tareaUuid,
      rol: "assistant",
      mensaje: reply,
    });

    return { reply, messageIdAssistant: saved.id };
  }
}
