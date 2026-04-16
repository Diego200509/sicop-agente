import type { SupabaseClient } from "@supabase/supabase-js";

import type { RevisionPayload } from "@/src/types/revision";

type TareaRecord = {
  id: string;
  id_tarea: string;
};

type NewTareaInput = {
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta?: string | null;
};

type NewRevisionInput = {
  tarea_id: string;
  tipo_revision: "documental" | "codigo";
  texto_pdf?: string | null;
  analisis_documental?: string | null;
  pr_number?: string | null;
  pr_title?: string | null;
  repo_owner?: string | null;
  repo_name?: string | null;
  codigo_pr?: string | null;
  analisis_codigo?: string | null;
};

export interface RevisionRepository {
  findTareaByExternalId(idTarea: string): Promise<TareaRecord | null>;
  createTarea(input: NewTareaInput): Promise<TareaRecord>;
  createRevision(input: NewRevisionInput): Promise<void>;
}

export class SupabaseRevisionRepository implements RevisionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findTareaByExternalId(idTarea: string): Promise<TareaRecord | null> {
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id, id_tarea")
      .eq("id_tarea", idTarea)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al buscar tarea: ${error.message}`);
    }

    return data;
  }

  async createTarea(input: NewTareaInput): Promise<TareaRecord> {
    const { data, error } = await this.supabase
      .from("tareas")
      .insert({
        id_tarea: input.id_tarea,
        titulo: input.titulo,
        fase: input.fase,
        descripcion: input.descripcion,
        url_tarjeta: input.url_tarjeta ?? null,
      })
      .select("id, id_tarea")
      .single();

    if (error) {
      throw new Error(`Error al crear tarea: ${error.message}`);
    }

    return data;
  }

  async createRevision(input: NewRevisionInput): Promise<void> {
    const { error } = await this.supabase.from("revisiones").insert({
      tarea_id: input.tarea_id,
      tipo_revision: input.tipo_revision,
      texto_pdf: input.texto_pdf ?? null,
      analisis_documental: input.analisis_documental ?? null,
      pr_number: input.pr_number ?? null,
      pr_title: input.pr_title ?? null,
      repo_owner: input.repo_owner ?? null,
      repo_name: input.repo_name ?? null,
      codigo_pr: input.codigo_pr ?? null,
      analisis_codigo: input.analisis_codigo ?? null,
      fecha_revision: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Error al crear revision: ${error.message}`);
    }
  }
}

export function mapPayloadToRevisionInput(
  payload: RevisionPayload,
  tareaId: string,
): NewRevisionInput {
  return {
    tarea_id: tareaId,
    tipo_revision: payload.tipo_revision,
    texto_pdf: payload.tipo_revision === "documental" ? payload.texto_pdf : payload.texto_pdf,
    analisis_documental:
      payload.tipo_revision === "documental"
        ? payload.analisis_documental
        : payload.analisis_documental,
    pr_number: payload.pr_number ?? null,
    pr_title: payload.pr_title ?? null,
    repo_owner: payload.repo_owner ?? null,
    repo_name: payload.repo_name ?? null,
    codigo_pr: payload.codigo_pr ?? null,
    analisis_codigo: payload.tipo_revision === "codigo" ? payload.analisis_codigo : null,
  };
}
