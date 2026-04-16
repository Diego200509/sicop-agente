import type { SupabaseClient } from "@supabase/supabase-js";

import type { RevisionContext } from "@/src/types/chat";

type RevisionRow = {
  id?: string;
  tipo_revision: "documental" | "codigo";
  fecha_revision: string | null;
  texto_pdf: string | null;
  analisis_documental: string | null;
  pr_title: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  codigo_pr: string | null;
  analisis_codigo: string | null;
};

export class RevisionesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getLatestByType(tareaId: string, tipo: "documental" | "codigo"): Promise<RevisionContext | null> {
    const { data, error } = await this.supabase
      .from("revisiones")
      .select(
        "id,tipo_revision,fecha_revision,texto_pdf,analisis_documental,pr_title,repo_owner,repo_name,codigo_pr,analisis_codigo",
      )
      .eq("tarea_id", tareaId)
      .eq("tipo_revision", tipo)
      .order("fecha_revision", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo revision: ${error.message}`);
    if (!data) return null;

    return this.mapRow(data as RevisionRow);
  }

  /** Para cada tarea, la revisión más reciente de cada tipo (máx. 2 por tarea) */
  async getLatestDocAndCodeForTareas(tareaIds: string[]): Promise<Map<string, { doc: RevisionContext | null; code: RevisionContext | null }>> {
    const result = new Map<string, { doc: RevisionContext | null; code: RevisionContext | null }>();

    if (tareaIds.length === 0) return result;

    const { data, error } = await this.supabase
      .from("revisiones")
      .select(
        "tarea_id,tipo_revision,fecha_revision,texto_pdf,analisis_documental,pr_title,repo_owner,repo_name,codigo_pr,analisis_codigo",
      )
      .in("tarea_id", tareaIds)
      .order("fecha_revision", { ascending: false });

    if (error) throw new Error(`Error obteniendo revisiones: ${error.message}`);

    const rows = (data ?? []) as Array<RevisionRow & { tarea_id: string }>;

    for (const id of tareaIds) {
      result.set(id, { doc: null, code: null });
    }

    for (const row of rows) {
      const tid = row.tarea_id as string;
      const entry = result.get(tid);
      if (!entry) continue;

      if (row.tipo_revision === "documental" && !entry.doc) {
        entry.doc = this.mapRow(row);
      }
      if (row.tipo_revision === "codigo" && !entry.code) {
        entry.code = this.mapRow(row);
      }
    }

    return result;
  }

  private mapRow(row: RevisionRow): RevisionContext {
    return {
      tipo_revision: row.tipo_revision,
      fecha_revision: row.fecha_revision,
      texto_pdf: row.texto_pdf,
      analisis_documental: row.analisis_documental,
      pr_title: row.pr_title,
      repo_owner: row.repo_owner,
      repo_name: row.repo_name,
      codigo_pr: row.codigo_pr,
      analisis_codigo: row.analisis_codigo,
    };
  }
}
