import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildMergeKey,
  buildMergeKeyPreferTech,
  fingerprintTituloFase,
  normalizeForTareaMerge,
} from "@/src/lib/tarea-match-key";
import type { RevisionPayload } from "@/src/types/revision";

type TareaRecord = {
  id: string;
  id_tarea: string;
};

type TareaRowForMerge = TareaRecord & {
  titulo: string;
  fase: string;
  descripcion: string;
  updated_at: string;
  created_at: string;
};

export type UpsertTareaInput = {
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta?: string | null;
  mergeKey?: string;
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

type PostgrestLikeError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export interface RevisionRepository {
  findTareaByExternalId(idTarea: string): Promise<TareaRecord | null>;
  findTareaByExternalIdOrUrlField(token: string): Promise<TareaRecord | null>;
  findTareaByTechnicalIdAndFase(technicalId: string, fase: string): Promise<TareaRecord | null>;
  findTareaByTituloYFaseNormalizados(
    titulo: string,
    fase: string,
    descripcion?: string | null,
  ): Promise<TareaRecord | null>;
  upsertTarea(input: UpsertTareaInput): Promise<TareaRecord>;
  createRevision(input: NewRevisionInput): Promise<void>;
}

function isRpcMissingError(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42883";
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return error.message?.toLowerCase().includes("duplicate key") ?? false;
}

function parseRpcTareaRow(data: unknown): TareaRecord | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row === "object" && "id" in row && "id_tarea" in row) {
    return { id: String((row as { id: unknown }).id), id_tarea: String((row as { id_tarea: unknown }).id_tarea) };
  }
  return null;
}

function formatSupabaseError(context: string, error: PostgrestLikeError): string {
  const parts = [
    context,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

/** Validación previa al INSERT en `revisiones` (mensajes claros antes del CHECK de PostgreSQL). */
export function validateRevisionInputForInsert(input: NewRevisionInput): void {
  const tid = input.tarea_id?.trim();
  if (!tid) {
    throw new Error("Revision invalida: tarea_id vacio");
  }

  if (input.tipo_revision !== "documental" && input.tipo_revision !== "codigo") {
    throw new Error(`Revision invalida: tipo_revision desconocido (${String(input.tipo_revision)})`);
  }

  if (input.tipo_revision === "codigo") {
    if (!input.analisis_codigo?.trim()) {
      throw new Error("Revision de codigo invalida: analisis_codigo vacio");
    }
  }

  if (input.tipo_revision === "documental") {
    if (!input.texto_pdf?.trim()) {
      throw new Error("Revision documental invalida: texto_pdf vacio");
    }
    if (!input.analisis_documental?.trim()) {
      throw new Error("Revision documental invalida: analisis_documental vacio");
    }
  }
}

export class SupabaseRevisionRepository implements RevisionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async findTareaByMergeKey(mergeKey: string): Promise<TareaRecord | null> {
    console.log("[SupabaseRevisionRepository] consulta por merge_key:", mergeKey);
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id, id_tarea")
      .eq("merge_key", mergeKey)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseRevisionRepository] error Supabase (merge_key):", error);
      throw new Error(formatSupabaseError("Error al buscar tarea por merge_key", error));
    }

    if (data) {
      console.log("[SupabaseRevisionRepository] tarea encontrada por merge_key:", { id: data.id, id_tarea: data.id_tarea });
    } else {
      console.log("[SupabaseRevisionRepository] sin fila para merge_key:", mergeKey);
    }
    return data;
  }

  private async updateTareaById(
    rowId: string,
    input: UpsertTareaInput,
    mergeKey: string,
    updatedAt: string,
  ): Promise<TareaRecord> {
    const v_tid = input.id_tarea.trim();

    const { data: otherWithIdTarea } = await this.supabase
      .from("tareas")
      .select("id")
      .eq("id_tarea", v_tid)
      .neq("id", rowId)
      .maybeSingle();

    const patch: Record<string, unknown> = {
      titulo: input.titulo,
      fase: input.fase,
      descripcion: input.descripcion,
      merge_key: mergeKey,
      updated_at: updatedAt,
      url_tarjeta: input.url_tarjeta?.trim() ? input.url_tarjeta : null,
    };

    if (!otherWithIdTarea) {
      patch.id_tarea = v_tid;
    } else {
      console.log(
        "[SupabaseRevisionRepository] id_tarea ya usado en otra fila; se mantiene id_tarea de la fila canónica",
        { rowId, solicitado: v_tid },
      );
    }

    const { data, error } = await this.supabase
      .from("tareas")
      .update(patch)
      .eq("id", rowId)
      .select("id, id_tarea")
      .single();

    if (error || !data) {
      console.error("[SupabaseRevisionRepository] error al actualizar tarea:", error);
      throw new Error(
        formatSupabaseError("Error al actualizar tarea existente", (error ?? { message: "sin fila" }) as PostgrestLikeError),
      );
    }

    console.log("[SupabaseRevisionRepository] tarea actualizada (reutilizada):", data);
    return data as TareaRecord;
  }

  async findTareaByExternalId(idTarea: string): Promise<TareaRecord | null> {
    console.log("[SupabaseRevisionRepository] buscando tarea por id_tarea:", idTarea);
    const { data, error } = await this.supabase
      .from("tareas")
      .select("id, id_tarea")
      .eq("id_tarea", idTarea)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseRevisionRepository] error Supabase (id_tarea):", error);
      throw new Error(formatSupabaseError("Error al buscar tarea por id_tarea", error));
    }

    console.log("[SupabaseRevisionRepository] resultado id_tarea:", data ? { id: data.id } : null);
    return data;
  }

  async findTareaByExternalIdOrUrlField(token: string): Promise<TareaRecord | null> {
    const t = token.trim();
    console.log("[SupabaseRevisionRepository] buscando tarea por id_tarea o url_tarjeta, token:", t);
    if (!t) return null;

    const byId = await this.findTareaByExternalId(t);
    if (byId) {
      console.log("[SupabaseRevisionRepository] encontrada por id_tarea");
      return byId;
    }

    const { data, error } = await this.supabase
      .from("tareas")
      .select("id, id_tarea")
      .eq("url_tarjeta", t)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseRevisionRepository] error Supabase (url_tarjeta):", error);
      throw new Error(formatSupabaseError("Error al buscar tarea por url_tarjeta", error));
    }

    console.log("[SupabaseRevisionRepository] resultado url_tarjeta:", data ? { id: data.id } : null);
    return data;
  }

  async findTareaByTechnicalIdAndFase(technicalId: string, fase: string): Promise<TareaRecord | null> {
    console.log("[SupabaseRevisionRepository] buscando por id tecnico en descripcion:", {
      technicalId,
      fase,
    });
    const tid = technicalId.trim();
    if (!tid) return null;

    const keyFase = normalizeForTareaMerge(fase);
    if (!keyFase) return null;

    const escaped = tid.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const pattern = `%ID: ${escaped}%`;

    const { data, error } = await this.supabase
      .from("tareas")
      .select("id, id_tarea, titulo, fase, descripcion, created_at")
      .ilike("descripcion", pattern);

    if (error) {
      console.error("[SupabaseRevisionRepository] error Supabase (id tecnico):", error);
      throw new Error(formatSupabaseError("Error al buscar tarea por ID técnico en descripcion", error));
    }

    const rows = (data ?? []) as TareaRowForMerge[];
    const matches = rows.filter((row) => normalizeForTareaMerge(row.fase) === keyFase);

    if (matches.length === 0) {
      console.log("[SupabaseRevisionRepository] id tecnico: sin coincidencias");
      return null;
    }

    matches.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const best = matches[0]!;
    console.log("[SupabaseRevisionRepository] id tecnico: fila elegida", { id: best.id });
    return { id: best.id, id_tarea: best.id_tarea };
  }

  async findTareaByTituloYFaseNormalizados(
    titulo: string,
    fase: string,
    descripcion?: string | null,
  ): Promise<TareaRecord | null> {
    console.log("[SupabaseRevisionRepository] buscando por titulo/fase normalizados:", { titulo, fase });
    const mergeKeys = new Set<string>();
    if (descripcion?.trim()) {
      mergeKeys.add(buildMergeKeyPreferTech(titulo, fase, descripcion));
    }
    mergeKeys.add(buildMergeKey(titulo, fase));
    for (const mergeKey of mergeKeys) {
      const byKey = await this.findTareaByMergeKey(mergeKey);
      if (byKey) return byKey;
    }

    const keyTitulo = normalizeForTareaMerge(titulo);
    const keyFase = normalizeForTareaMerge(fase);
    if (!keyTitulo || !keyFase) return null;

    const { data, error } = await this.supabase
      .from("tareas")
      .select("id, id_tarea, titulo, fase, descripcion, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .limit(800);

    if (error) {
      console.error("[SupabaseRevisionRepository] error Supabase (titulo/fase):", error);
      throw new Error(formatSupabaseError("Error al buscar tarea por titulo/fase", error));
    }

    const rows = (data ?? []) as TareaRowForMerge[];
    const fpPayload = fingerprintTituloFase(titulo, fase);

    const sameKey = (row: TareaRowForMerge) =>
      normalizeForTareaMerge(row.titulo) === keyTitulo && normalizeForTareaMerge(row.fase) === keyFase;

    const sameFingerprint = (row: TareaRowForMerge) =>
      fingerprintTituloFase(row.titulo, row.fase) === fpPayload;

    let matches = rows.filter(sameKey);
    if (matches.length === 0) {
      matches = rows.filter(sameFingerprint);
    }

    if (matches.length === 0) {
      console.log("[SupabaseRevisionRepository] titulo/fase: sin coincidencias");
      return null;
    }

    matches.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const best = matches[0]!;
    console.log("[SupabaseRevisionRepository] titulo/fase: fila elegida", { id: best.id });
    return { id: best.id, id_tarea: best.id_tarea };
  }

  /**
   * 1) RPC atómica en BD si existe.
   * 2) Si no: get-or-create por merge_key (SELECT → UPDATE | INSERT), sin PostgREST `.upsert` en merge_key
   *    (el índice único parcial + 23505 en carrera se resuelve reconsultando merge_key).
   */
  async upsertTarea(input: UpsertTareaInput): Promise<TareaRecord> {
    const mergeKey =
      input.mergeKey?.trim() ||
      buildMergeKeyPreferTech(input.titulo, input.fase, input.descripcion);
    const updatedAt = new Date().toISOString();

    console.log("[SupabaseRevisionRepository] upsertTarea merge_key calculado:", mergeKey, {
      id_tarea: input.id_tarea,
      titulo: input.titulo,
      fase: input.fase,
    });

    console.log("[SupabaseRevisionRepository] intento RPC upsert_tarea_by_merge_key…");
    const { data, error } = await this.supabase.rpc("upsert_tarea_by_merge_key", {
      p_id_tarea: input.id_tarea.trim(),
      p_titulo: input.titulo,
      p_fase: input.fase,
      p_descripcion: input.descripcion,
      p_url_tarjeta: input.url_tarjeta ?? null,
      p_merge_key: mergeKey,
      p_updated_at: updatedAt,
    });

    if (error) {
      console.error("[SupabaseRevisionRepository] RPC upsert_tarea_by_merge_key error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log("[SupabaseRevisionRepository] RPC respuesta raw:", JSON.stringify(data, null, 2));
    }

    const fromRpc = parseRpcTareaRow(data);
    if (!error && fromRpc) {
      console.log("[SupabaseRevisionRepository] tarea final (RPC):", fromRpc);
      return fromRpc;
    }

    if (!error && !fromRpc) {
      console.warn("[SupabaseRevisionRepository] RPC sin fila parseable; fallback getOrCreate por merge_key");
      return this.getOrCreateTareaByMergeKeyClient(input, mergeKey, updatedAt);
    }

    if (isRpcMissingError(error)) {
      console.warn("[SupabaseRevisionRepository] RPC no definida (42883); fallback getOrCreate por merge_key");
      return this.getOrCreateTareaByMergeKeyClient(input, mergeKey, updatedAt);
    }

    throw new Error(
      formatSupabaseError("Error al upsert tarea (RPC)", error as PostgrestLikeError),
    );
  }

  /**
   * Sin depender de `.upsert(onConflict: merge_key)` sobre índice parcial (evita INSERT duplicado → 23505).
   */
  private async getOrCreateTareaByMergeKeyClient(
    input: UpsertTareaInput,
    mergeKey: string,
    updatedAt: string,
  ): Promise<TareaRecord> {
    console.log("[SupabaseRevisionRepository] getOrCreateTareaByMergeKeyClient merge_key:", mergeKey);

    const byMerge = await this.findTareaByMergeKey(mergeKey);
    if (byMerge) {
      console.log("[SupabaseRevisionRepository] reutilizando tarea existente (merge_key), aplicando UPDATE");
      return this.updateTareaById(byMerge.id, input, mergeKey, updatedAt);
    }

    const byIdTarea = await this.findTareaByExternalId(input.id_tarea.trim());
    if (byIdTarea) {
      console.log(
        "[SupabaseRevisionRepository] tarea existente por id_tarea (legado / otro flujo), enlazando merge_key y UPDATE",
        byIdTarea.id,
      );
      return this.updateTareaById(byIdTarea.id, input, mergeKey, updatedAt);
    }

    console.log("[SupabaseRevisionRepository] insert nueva fila en tareas (ninguna coincidencia previa)…");
    const { data, error } = await this.supabase
      .from("tareas")
      .insert({
        id_tarea: input.id_tarea.trim(),
        titulo: input.titulo,
        fase: input.fase,
        descripcion: input.descripcion,
        url_tarjeta: input.url_tarjeta?.trim() ? input.url_tarjeta : null,
        merge_key: mergeKey,
        updated_at: updatedAt,
      })
      .select("id, id_tarea")
      .single();

    if (error && isUniqueViolation(error)) {
      console.warn(
        "[SupabaseRevisionRepository] conflicto 23505 (unique) en insert tareas; reconsultando por merge_key e id_tarea…",
        { code: error.code, message: error.message },
      );

      const afterMerge = await this.findTareaByMergeKey(mergeKey);
      if (afterMerge) {
        console.log("[SupabaseRevisionRepository] tarea final reutilizada tras 23505 (merge_key):", afterMerge.id);
        return this.updateTareaById(afterMerge.id, input, mergeKey, updatedAt);
      }

      const afterId = await this.findTareaByExternalId(input.id_tarea.trim());
      if (afterId) {
        console.log("[SupabaseRevisionRepository] tarea final reutilizada tras 23505 (id_tarea):", afterId.id);
        return this.updateTareaById(afterId.id, input, mergeKey, updatedAt);
      }

      throw new Error(
        formatSupabaseError(
          "23505 en insert tareas y no se pudo resolver fila existente por merge_key ni id_tarea",
          error as PostgrestLikeError,
        ),
      );
    }

    if (error || !data) {
      console.error("[SupabaseRevisionRepository] insert tareas error:", error);
      throw new Error(
        formatSupabaseError("Error al insertar tarea", (error ?? { message: "sin fila" }) as PostgrestLikeError),
      );
    }

    console.log("[SupabaseRevisionRepository] tarea final (nueva insertada):", data);
    return data as TareaRecord;
  }

  async createRevision(input: NewRevisionInput): Promise<void> {
    console.log("[createRevision] validando input antes de insert…");
    validateRevisionInputForInsert(input);

    console.log("[createRevision] input:", JSON.stringify(input, null, 2));

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
      console.error("[createRevision] error Supabase insert:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(formatSupabaseError("Error al crear revision (insert revisiones)", error));
    }

    console.log("[createRevision] revision insertada correctamente");
  }
}

export function mapPayloadToRevisionInput(
  payload: RevisionPayload,
  tareaId: string,
): NewRevisionInput {
  console.log("[mapPayloadToRevisionInput] payload recibido:", JSON.stringify(payload, null, 2));
  console.log("[mapPayloadToRevisionInput] resumen:", {
    tipo_revision: payload.tipo_revision,
    tarea_id: tareaId,
    pr_number: payload.pr_number ?? null,
    pr_title: payload.pr_title ?? null,
    repo_owner: payload.repo_owner ?? null,
    repo_name: payload.repo_name ?? null,
    tiene_texto_pdf: !!payload.texto_pdf?.trim(),
    tiene_analisis_documental: !!payload.analisis_documental?.trim(),
    tiene_codigo_pr: !!payload.codigo_pr?.trim(),
    tiene_analisis_codigo: !!payload.analisis_codigo?.trim(),
    len_texto_pdf: payload.texto_pdf?.length ?? 0,
    len_analisis_documental: payload.analisis_documental?.length ?? 0,
    len_codigo_pr: payload.codigo_pr?.length ?? 0,
    len_analisis_codigo: payload.analisis_codigo?.length ?? 0,
  });

  const input: NewRevisionInput = {
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

  console.log("[mapPayloadToRevisionInput] NewRevisionInput resultante:", JSON.stringify(input, null, 2));
  return input;
}
