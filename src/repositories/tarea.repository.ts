import type { SupabaseClient } from "@supabase/supabase-js";

import { requiresCodeReviewByPhase } from "@/src/lib/fases";

export type TareaListado = {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  estado_documental: "completo" | "pendiente";
  estado_codigo: "completo" | "pendiente" | "no_aplica";
  fecha_ultima_revision: string | null;
  orden: number | null;
  created_at: string;
};

export type TareaDetalle = {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta: string | null;
  estado_documental: "completo" | "pendiente";
  estado_codigo: "completo" | "pendiente" | "no_aplica";
  documental: {
    texto_pdf: string | null;
    analisis_documental: string | null;
  };
  codigo: {
    pr_title: string | null;
    repo_owner: string | null;
    repo_name: string | null;
    codigo_pr: string | null;
    analisis_codigo: string | null;
  };
};

export type DashboardData = {
  total_tareas: number;
  total_revisiones_documentales: number;
  total_revisiones_codigo: number;
  ultimas_revisiones: Array<{
    id: string;
    tarea_uuid: string;
    id_tarea: string;
    tipo_revision: "documental" | "codigo";
    fecha_revision: string | null;
    titulo_tarea: string;
    fase_tarea: string;
    descripcion: string;
  }>;
};

type RevisionRow = {
  id: string;
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

type TareaJoinRow = {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta: string | null;
  revisiones: RevisionRow[] | null;
};

function isUuidParam(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export class TareaRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listTareas(search?: string): Promise<TareaListado[]> {
    let query = this.supabase
      .from("tareas")
      .select("id,id_tarea,titulo,fase,orden,created_at,revisiones(tipo_revision,fecha_revision)");

    if (search) query = query.ilike("titulo", `%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`Error listando tareas: ${error.message}`);

    const rows = (data ?? []) as Array<{
      id: string;
      id_tarea: string;
      titulo: string;
      fase: string;
      orden: number | null;
      created_at: string;
      revisiones: Array<{ tipo_revision: "documental" | "codigo"; fecha_revision: string | null }> | null;
    }>;

    const mapped = rows.map((row) => {
      const revisiones = row.revisiones ?? [];
      const hasDocumental = revisiones.some((revision) => revision.tipo_revision === "documental");
      const hasCodigo = revisiones.some((revision) => revision.tipo_revision === "codigo");
      const codeRequired = requiresCodeReviewByPhase(row.fase);
      const ultimaRevision = revisiones
        .map((revision) => revision.fecha_revision)
        .filter(Boolean)
        .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0];

      const item: TareaListado = {
        id: row.id,
        id_tarea: row.id_tarea,
        titulo: row.titulo,
        fase: row.fase,
        estado_documental: hasDocumental ? "completo" : "pendiente",
        estado_codigo: codeRequired ? (hasCodigo ? "completo" : "pendiente") : "no_aplica",
        fecha_ultima_revision: (ultimaRevision as string | undefined) ?? null,
        orden: row.orden ?? null,
        created_at: row.created_at,
      };
      return item;
    });

    return mapped;
  }

  async updateOrdenBatch(updates: Array<{ id: string; orden: number }>): Promise<void> {
    if (updates.length === 0) return;
    const now = new Date().toISOString();
    for (const u of updates) {
      const { error } = await this.supabase
        .from("tareas")
        .update({ orden: u.orden, updated_at: now })
        .eq("id", u.id);
      if (error) throw new Error(`Error actualizando orden de tarea ${u.id}: ${error.message}`);
    }
  }

  async getTareaDetail(idOrIdTarea: string): Promise<TareaDetalle | null> {
    const select =
      "id,id_tarea,titulo,fase,descripcion,url_tarjeta,revisiones(id,tipo_revision,fecha_revision,texto_pdf,analisis_documental,pr_title,repo_owner,repo_name,codigo_pr,analisis_codigo)";

    const param = idOrIdTarea.trim();

    const fetchRow = async (column: "id" | "id_tarea") => {
      const { data, error } = await this.supabase.from("tareas").select(select).eq(column, param).maybeSingle();
      if (error) throw new Error(`Error obteniendo detalle de tarea: ${error.message}`);
      return data as TareaJoinRow | null;
    };

    let data: TareaJoinRow | null = null;
    if (isUuidParam(param)) {
      data = await fetchRow("id");
    }
    if (!data) {
      data = await fetchRow("id_tarea");
    }
    if (!data && param.includes("|||")) {
      const { data: byMerge, error } = await this.supabase.from("tareas").select(select).eq("merge_key", param).maybeSingle();
      if (error) throw new Error(`Error obteniendo detalle de tarea: ${error.message}`);
      data = byMerge as TareaJoinRow | null;
    }

    if (!data) return null;

    const tarea = data as TareaJoinRow;
    const revisiones = (tarea.revisiones ?? []).sort(
      (a, b) => new Date(b.fecha_revision ?? 0).getTime() - new Date(a.fecha_revision ?? 0).getTime(),
    );
    const codeRequired = requiresCodeReviewByPhase(tarea.fase);
    const revisionDocumental = revisiones.find((revision) => revision.tipo_revision === "documental");
    const revisionCodigo = revisiones.find((revision) => revision.tipo_revision === "codigo");

    return {
      id: tarea.id,
      id_tarea: tarea.id_tarea,
      titulo: tarea.titulo,
      fase: tarea.fase,
      descripcion: tarea.descripcion,
      url_tarjeta: tarea.url_tarjeta,
      estado_documental: revisionDocumental ? "completo" : "pendiente",
      estado_codigo: codeRequired ? (revisionCodigo ? "completo" : "pendiente") : "no_aplica",
      documental: {
        texto_pdf: revisionDocumental?.texto_pdf ?? null,
        analisis_documental: revisionDocumental?.analisis_documental ?? null,
      },
      codigo: {
        pr_title: revisionCodigo?.pr_title ?? null,
        repo_owner: revisionCodigo?.repo_owner ?? null,
        repo_name: revisionCodigo?.repo_name ?? null,
        codigo_pr: revisionCodigo?.codigo_pr ?? null,
        analisis_codigo: revisionCodigo?.analisis_codigo ?? null,
      },
    };
  }

  async getDashboardData(): Promise<DashboardData> {
    const [tareasResult, revisionesCountResult, ultimasResult] = await Promise.all([
      this.supabase.from("tareas").select("id", { count: "exact", head: true }),
      this.supabase.from("revisiones").select("tipo_revision"),
      this.supabase
        .from("revisiones")
        .select("id,tipo_revision,fecha_revision,analisis_documental,analisis_codigo,tareas(id,id_tarea,titulo,fase)")
        .order("fecha_revision", { ascending: false })
        .limit(8),
    ]);

    if (tareasResult.error) throw new Error(`Error obteniendo total tareas: ${tareasResult.error.message}`);
    if (revisionesCountResult.error) {
      throw new Error(`Error obteniendo totales de revisiones: ${revisionesCountResult.error.message}`);
    }
    if (ultimasResult.error) throw new Error(`Error obteniendo ultimas revisiones: ${ultimasResult.error.message}`);

    const revisiones = revisionesCountResult.data ?? [];
    const totalDocumentales = revisiones.filter((revision) => revision.tipo_revision === "documental").length;
    const totalCodigo = revisiones.filter((revision) => revision.tipo_revision === "codigo").length;

    const ultimasRevisiones = (ultimasResult.data ?? []).map((revision) => {
      const row = revision as {
        id: string;
        tipo_revision: "documental" | "codigo";
        fecha_revision: string | null;
        analisis_documental: string | null;
        analisis_codigo: string | null;
        tareas:
          | { id: string; id_tarea: string; titulo: string; fase: string }
          | Array<{ id: string; id_tarea: string; titulo: string; fase: string }>
          | null;
      };

      const tareaJoin = Array.isArray(row.tareas) ? row.tareas[0] : row.tareas;

      return {
        id: row.id,
        tarea_uuid: tareaJoin?.id ?? "",
        id_tarea: tareaJoin?.id_tarea ?? "",
        tipo_revision: row.tipo_revision,
        fecha_revision: row.fecha_revision,
        titulo_tarea: tareaJoin?.titulo ?? "Sin titulo",
        fase_tarea: tareaJoin?.fase ?? "Sin fase",
        descripcion: row.tipo_revision === "documental" ? row.analisis_documental ?? "" : row.analisis_codigo ?? "",
      };
    });

    return {
      total_tareas: tareasResult.count ?? 0,
      total_revisiones_documentales: totalDocumentales,
      total_revisiones_codigo: totalCodigo,
      ultimas_revisiones: ultimasRevisiones,
    };
  }
}
