import type { SupabaseClient } from "@supabase/supabase-js";

import type { TareaContext } from "@/src/types/chat";

export class TareasRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getByUuid(id: string): Promise<TareaContext | null> {
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id,id_tarea,titulo,fase,descripcion,url_tarjeta,inicio,fin,completado,estado,created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo tarea: ${error.message}`);
    if (!data) return null;

    return data as TareaContext;
  }

  async getIdByExternalId(idTarea: string): Promise<string | null> {
    const p = idTarea.trim();
    if (p.includes("|||")) {
      const { data, error } = await this.supabase.from("tareas").select("id").eq("merge_key", p).maybeSingle();
      if (error) throw new Error(`Error resolviendo tarea: ${error.message}`);
      if (data?.id) return data.id as string;
    }

    const { data, error } = await this.supabase.from("tareas").select("id").eq("id_tarea", p).maybeSingle();

    if (error) throw new Error(`Error resolviendo tarea: ${error.message}`);
    return (data?.id as string | undefined) ?? null;
  }

  /**
   * Resuelve UUID interno: id, id_tarea del último webhook, o merge_key literal (`ds1|||desarrollo`).
   * La identidad estable entre flujos n8n es merge_key; id_tarea puede cambiar entre documental y código.
   */
  async resolveTareaUuid(idOrExternal: string): Promise<string | null> {
    const p = idOrExternal.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);

    if (isUuid) {
      const { data, error } = await this.supabase.from("tareas").select("id").eq("id", p).maybeSingle();
      if (error) throw new Error(`Error resolviendo tarea: ${error.message}`);
      if (data?.id) return data.id as string;
    }

    if (p.includes("|||")) {
      const { data, error } = await this.supabase.from("tareas").select("id").eq("merge_key", p).maybeSingle();
      if (error) throw new Error(`Error resolviendo tarea: ${error.message}`);
      if (data?.id) return data.id as string;
    }

    const { data, error: err2 } = await this.supabase.from("tareas").select("id").eq("id_tarea", p).maybeSingle();
    if (err2) throw new Error(`Error resolviendo tarea: ${err2.message}`);
    return (data?.id as string | undefined) ?? null;
  }

  async getLatestForGeneralChat(limit: number): Promise<TareaContext[]> {
    const safe = Math.min(100, Math.max(1, Math.floor(limit)));
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id,id_tarea,titulo,fase,descripcion,url_tarjeta,inicio,fin,completado,estado,created_at")
      .order("updated_at", { ascending: false })
      .limit(safe);

    if (error) throw new Error(`Error listando tareas recientes: ${error.message}`);
    return (data ?? []) as TareaContext[];
  }

  async countAllForGeneralChat(): Promise<number> {
    const { count, error } = await this.supabase.from("tareas").select("id", {
      count: "exact",
      head: true,
    });

    if (error) throw new Error(`Error contando tareas para chat general: ${error.message}`);
    return count ?? 0;
  }

  /**
   * Lista acotada para resolver menciones de tarea en el chat general (titulos e ids).
   */
  async listForMatching(limit: number): Promise<TareaContext[]> {
    const safe = Math.min(500, Math.max(1, Math.floor(limit)));
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id,id_tarea,titulo,fase,descripcion,url_tarjeta,inicio,fin,completado,estado,created_at")
      .order("updated_at", { ascending: false })
      .limit(safe);

    if (error) throw new Error(`Error listando tareas para coincidencia: ${error.message}`);
    return (data ?? []) as TareaContext[];
  }
}
