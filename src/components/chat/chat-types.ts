import type { ChatMessage, ChatRole } from "@/src/types/chat";

export type UiMessageStatus = "confirmed" | "optimistic" | "loading" | "error";

/**
 * Mensaje mostrado en el chat (persistido o optimista / placeholder).
 * `correlationId` agrupa un par usuario-asistente generado en un mismo envío.
 */
export type UiChatMessage = ChatMessage & {
  status?: UiMessageStatus;
  errorDetail?: string;
  correlationId?: string;
};

export function toUiMessages(rows: ChatMessage[]): UiChatMessage[] {
  return rows.map((m) => ({ ...m, status: "confirmed" as const }));
}

export function isLocalMessageId(id: string): boolean {
  return id.startsWith("local-");
}
