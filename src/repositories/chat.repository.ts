import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChatMessage, ChatRole } from "@/src/types/chat";

export class ChatRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async insertMessage(input: {
    tareaId: string | null;
    rol: ChatRole;
    mensaje: string;
  }): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("mensajes_chat")
      .insert({
        tarea_id: input.tareaId,
        rol: input.rol,
        mensaje: input.mensaje,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Error guardando mensaje de chat: ${error.message}`);
    return { id: data.id as string };
  }

  /** Últimos N mensajes para contexto del modelo (cronológicos) */
  async getLastMessagesForContext(tareaId: string | null, count: number): Promise<ChatMessage[]> {
    let query = this.supabase.from("mensajes_chat").select("id,tarea_id,rol,mensaje,created_at");

    if (tareaId === null) {
      query = query.is("tarea_id", null);
    } else {
      query = query.eq("tarea_id", tareaId);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(count);

    if (error) throw new Error(`Error leyendo historial para contexto: ${error.message}`);

    const rows = (data ?? []) as ChatMessage[];
    return rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  /** UI: últimos mensajes (cronológicos, más reciente al final) */
  async getMessagesForUi(tareaId: string | null, limit = 20): Promise<ChatMessage[]> {
    let query = this.supabase.from("mensajes_chat").select("id,tarea_id,rol,mensaje,created_at");

    if (tareaId === null) {
      query = query.is("tarea_id", null);
    } else {
      query = query.eq("tarea_id", tareaId);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

    if (error) throw new Error(`Error leyendo mensajes: ${error.message}`);

    const rows = (data ?? []) as ChatMessage[];
    return rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
}
