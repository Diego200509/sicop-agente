export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  tarea_id: string | null;
  rol: ChatRole;
  mensaje: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  tareaId?: string | null;
}

export interface ChatResponse {
  reply: string;
  messageIdAssistant?: string;
}

export interface ChatContext {
  mode: "general" | "tarea";
  /** Texto compacto para el modelo */
  contextText: string;
}

export interface TareaContext {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
}

export interface RevisionContext {
  tipo_revision: "documental" | "codigo";
  fecha_revision: string | null;
  texto_pdf?: string | null;
  analisis_documental?: string | null;
  pr_title?: string | null;
  repo_owner?: string | null;
  repo_name?: string | null;
  codigo_pr?: string | null;
  analisis_codigo?: string | null;
}

export interface ConclusionResult {
  nivel_cumplimiento: "Completo" | "Parcial" | "No cumple";
  coincidencias: string;
  diferencias: string;
  riesgos_observaciones: string;
  recomendacion_final: string;
  texto_completo: string;
}
