import type { SupabaseClient } from "@supabase/supabase-js";

import type { TareaContext } from "@/src/types/chat";

const TAREA_CONTEXT_SELECT =
  "id,id_tarea,titulo,fase,descripcion,url_tarjeta,inicio,fin,completado,estado,created_at";

export class TareasRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getByUuid(id: string): Promise<TareaContext | null> {
    const { data, error } = await this.supabase
      .from("tareas")
      .select(TAREA_CONTEXT_SELECT)
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
    return this.getLatestReviewedForGeneralChat(limit);
  }

  async getLatestReviewedForGeneralChat(limit: number): Promise<TareaContext[]> {
    const safe = Math.min(100, Math.max(1, Math.floor(limit)));
    const revisionScanLimit = Math.min(500, safe * 5);

    const { data: revisionesData, error: revisionesError } = await this.supabase
      .from("revisiones")
      .select("tarea_id,fecha_revision")
      .order("fecha_revision", { ascending: false })
      .limit(revisionScanLimit);

    if (revisionesError) {
      throw new Error(`Error listando tareas por revision reciente: ${revisionesError.message}`);
    }

    const reviewedIds: string[] = [];
    const seen = new Set<string>();

    for (const revision of revisionesData ?? []) {
      const tareaId = revision.tarea_id as string | null | undefined;
      if (!tareaId || seen.has(tareaId)) continue;

      seen.add(tareaId);
      reviewedIds.push(tareaId);
      if (reviewedIds.length >= safe) break;
    }

    const reviewedTasks = reviewedIds.length > 0 ? await this.getTareasByIds(reviewedIds) : [];

    if (reviewedTasks.length >= safe) {
      return reviewedTasks.slice(0, safe);
    }

    const remaining = safe - reviewedTasks.length;
    const { data: fallbackData, error: fallbackError } = await this.supabase
      .from("tareas")
      .select(TAREA_CONTEXT_SELECT)
      .order("updated_at", { ascending: false })
      .limit(safe + reviewedIds.length);

    if (fallbackError) {
      throw new Error(`Error listando tareas recientes como respaldo: ${fallbackError.message}`);
    }

    const fallbackTasks = ((fallbackData ?? []) as TareaContext[])
      .filter((task) => !seen.has(task.id))
      .slice(0, remaining);

    return [...reviewedTasks, ...fallbackTasks];
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
    return this.getLatestReviewedForGeneralChat(Math.min(500, Math.max(1, Math.floor(limit))));
  }

  private async getTareasByIds(ids: string[]): Promise<TareaContext[]> {
    const { data, error } = await this.supabase
      .from("tareas")
      .select(TAREA_CONTEXT_SELECT)
      .in("id", ids);

    if (error) throw new Error(`Error obteniendo tareas revisadas: ${error.message}`);

    const taskMap = new Map(((data ?? []) as TareaContext[]).map((task) => [task.id, task]));
    return ids.map((id) => taskMap.get(id)).filter((task): task is TareaContext => task != null);
  }
}
