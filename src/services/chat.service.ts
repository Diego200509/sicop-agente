import OpenAI from "openai";

import { getChatGeneralConfig } from "@/src/lib/chat-general-config";
import { truncateText } from "@/src/lib/chat-text";
import { ChatRepository } from "@/src/repositories/chat.repository";
import { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import { TareasRepository } from "@/src/repositories/tareas.repository";
import { buildGeneralContext, buildTaskFocusedContext } from "@/src/services/chat-general-context";
import { resolveGeneralTaskFromMessage } from "@/src/services/chat-general-resolution";
import type { ChatContext, ChatResponse, RevisionContext } from "@/src/types/chat";

const SYSTEM_PROMPT = `Eres el asistente del proyecto SICOP. Respondes solo con base en la informacion que se te proporciona en el contexto (tareas y revisiones almacenadas en el sistema).
Ayudas a interpretar revisiones documentales y revisiones de codigo, comparas cumplimiento, diferencias, riesgos y observaciones entre ambas cuando aplique.
Si falta informacion en el contexto, dilo con claridad. No inventes datos ni supongas fuera del contexto.
Responde en espanol, de forma profesional y concisa.`;

function formatRevisionDoc(r: RevisionContext | null): string {
  if (!r) return "(Sin revision documental registrada)";
  return [
    `Fecha: ${r.fecha_revision ?? "N/D"}`,
    `Texto PDF (extracto): ${truncateText(r.texto_pdf, 600)}`,
    `Analisis documental: ${truncateText(r.analisis_documental, 1200)}`,
  ].join("\n");
}

function formatRevisionCode(r: RevisionContext | null): string {
  if (!r) return "(Sin revision de codigo registrada)";
  const repo = [r.repo_owner, r.repo_name].filter(Boolean).join("/");
  return [
    `Fecha: ${r.fecha_revision ?? "N/D"}`,
    `PR: ${r.pr_title ?? "N/D"} | Repo: ${repo || "N/D"}`,
    `Codigo PR (extracto): ${truncateText(r.codigo_pr, 600)}`,
    `Analisis codigo: ${truncateText(r.analisis_codigo, 1200)}`,
  ].join("\n");
}

function formatHistoryBlock(messages: Array<{ rol: string; mensaje: string }>): string {
  if (messages.length === 0) return "(Sin mensajes previos en este hilo)";
  return messages
    .map((m) => `${m.rol === "user" ? "Usuario" : "Asistente"}: ${truncateText(m.mensaje, 1500)}`)
    .join("\n");
}

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

  async buildContext(tareaUuid: string | null): Promise<ChatContext> {
    if (tareaUuid) {
      const tarea = await this.tareasRepo.getByUuid(tareaUuid);
      if (!tarea) {
        return { mode: "tarea", contextText: "(Tarea no encontrada)" };
      }

      const [doc, code, history] = await Promise.all([
        this.revisionesRepo.getLatestByType(tareaUuid, "documental"),
        this.revisionesRepo.getLatestByType(tareaUuid, "codigo"),
        this.chatRepo.getLastMessagesForContext(tareaUuid, 6),
      ]);

      const ctx = [
        "## Tarea",
        `ID interno: ${tarea.id}`,
        `ID tarjeta: ${tarea.id_tarea}`,
        `Titulo: ${tarea.titulo}`,
        `Fase: ${tarea.fase}`,
        `Descripcion: ${truncateText(tarea.descripcion, 2000)}`,
        "",
        "## Revision documental mas reciente",
        formatRevisionDoc(doc),
        "",
        "## Revision de codigo mas reciente",
        formatRevisionCode(code),
        "",
        "## Ultimos mensajes del chat de esta tarea (max 6)",
        formatHistoryBlock(history),
      ].join("\n");

      return { mode: "tarea", contextText: ctx };
    }

    const config = getChatGeneralConfig();
    const contextText = await buildGeneralContext(this.tareasRepo, this.revisionesRepo, this.chatRepo, config);
    return { mode: "general", contextText };
  }

  async sendMessage(userMessage: string, tareaUuid: string | null): Promise<ChatResponse> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      throw new Error("Mensaje vacio");
    }

    await this.chatRepo.insertMessage({ tareaId: tareaUuid, rol: "user", mensaje: trimmed });

    let contextText: string;

    if (tareaUuid) {
      const built = await this.buildContext(tareaUuid);
      contextText = built.contextText;
    } else {
      const config = getChatGeneralConfig();
      const pool = await this.tareasRepo.listForMatching(config.matchingPool);
      const matchTasks = pool.map((t) => ({ id: t.id, id_tarea: t.id_tarea, titulo: t.titulo }));

      const resolution = await resolveGeneralTaskFromMessage({
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
        contextText = await buildTaskFocusedContext(
          resolution.taskId,
          this.tareasRepo,
          this.revisionesRepo,
          this.chatRepo,
          config,
        );
      } else {
        contextText = await buildGeneralContext(this.tareasRepo, this.revisionesRepo, this.chatRepo, config);
      }
    }

    const completion = await this.openai.chat.completions.create({
      model: this.model(),
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
