import OpenAI from "openai";

import { findTaskByFlexibleMatch, type TaskForMatch } from "@/src/lib/chat-general-task-resolution";

const DISAMBIG_SYSTEM = `Eres un clasificador para el proyecto SICOP. Recibes el mensaje del usuario y una lista corta de tareas (id UUID interno + titulo).
Debes elegir como mucho UNA tarea si el usuario se refiere claramente a ella por significado (sin inventar).
Si ninguna coincide de forma razonable, indica null.
Responde SOLO con un JSON valido sin markdown: {"chosen_id":"<uuid>"} o {"chosen_id":null}
El uuid debe ser exactamente uno de los ids propuestos o null.`;

export type GeneralTaskResolution =
  | { kind: "single"; taskId: string }
  | { kind: "ambiguous"; titles: string[] }
  | { kind: "none" };

type Params = {
  userMessage: string;
  tasks: TaskForMatch[];
  openai: OpenAI;
  model: string;
};

async function resolveWithLlm(
  openai: OpenAI,
  model: string,
  userMessage: string,
  candidates: TaskForMatch[],
): Promise<string | null> {
  if (candidates.length === 0) return null;

  const payload = {
    userMessage,
    candidatas: candidates.map((c) => ({
      id: c.id,
      id_tarjeta: c.id_tarea,
      titulo: c.titulo,
    })),
  };

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: DISAMBIG_SYSTEM },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { chosen_id?: string | null };
    const id = parsed.chosen_id;
    if (id == null || id === "") return null;
    const ok = candidates.some((c) => c.id === id);
    return ok ? id : null;
  } catch {
    return null;
  }
}

export async function resolveGeneralTaskFromMessage(params: Params): Promise<GeneralTaskResolution> {
  const { userMessage, tasks, openai, model } = params;
  const local = findTaskByFlexibleMatch(userMessage, tasks);

  if (local.kind === "single") {
    return { kind: "single", taskId: local.taskId };
  }

  if (local.kind === "ambiguous") {
    return { kind: "ambiguous", titles: local.titles };
  }

  if (local.kind === "llm_candidates") {
    const cand = local.candidates.map((c) => c.task);
    const picked = await resolveWithLlm(openai, model, userMessage, cand);
    if (picked) {
      return { kind: "single", taskId: picked };
    }
    return { kind: "none" };
  }

  return { kind: "none" };
}
