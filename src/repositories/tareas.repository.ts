import type { SupabaseClient } from "@supabase/supabase-js";

import type { TareaContext } from "@/src/types/chat";

export class TareasRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getByUuid(id: string): Promise<TareaContext | null> {
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id,id_tarea,titulo,fase,descripcion")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo tarea: ${error.message}`);
    if (!data) return null;

    return data as TareaContext;
  }

  async getIdByExternalId(idTarea: string): Promise<string | null> {
    const { data, error } = await this.supabase.from("tareas").select("id").eq("id_tarea", idTarea).maybeSingle();

    if (error) throw new Error(`Error resolviendo tarea: ${error.message}`);
    return (data?.id as string | undefined) ?? null;
  }

  /** Últimas 5 tareas por updated_at */
  async getLatestFive(): Promise<TareaContext[]> {
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id,id_tarea,titulo,fase,descripcion")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) throw new Error(`Error listando tareas recientes: ${error.message}`);
    return (data ?? []) as TareaContext[];
  }
}
