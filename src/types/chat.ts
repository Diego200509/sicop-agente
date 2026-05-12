import type { DocumentQuestionType } from "@/src/lib/document-sections";
import type { PhaseMode } from "@/src/lib/fases";

export type ChatUserIntent = "conversacional" | "consulta" | "analisis";
export type ChatQuestionKind =
  | "general"
  | "task_list"
  | "project_status"
  | "missing_work"
  | "overdue"
  | "risks"
  | "executive_summary"
  | "priority_ranking";

export type { DocumentQuestionType } from "@/src/lib/document-sections";

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

/** Metadatos para armar el system prompt del chat (fase, comparación, alcance). */
export interface ChatPromptMeta {
  /** null = contexto general con varias tareas (cada bloque ya refleja su fase). */
  phaseMode: PhaseMode | null;
  /** true si el contexto incluye el bloque comparativo documentación vs código. */
  comparativeActive: boolean;
  /** Lista de tareas recientes sin foco único. */
  generalBroad: boolean;
  /** Intención del mensaje actual; define el formato de la respuesta (solo en sendMessage). */
  intent?: ChatUserIntent;
  /** Tipo especifico de pregunta; define enfoque de contexto y formato esperado. */
  questionKind?: ChatQuestionKind;
  /** true si el contexto incluye fragmentos del texto fuente (PDF) recuperados por seccion. */
  documentEvidenceActive?: boolean;
  /** Numero de tareas incluidas efectivamente en el contexto general. */
  projectTasksLoaded?: number;
  /** Total de tareas disponibles en la base para el proyecto. */
  projectTasksAvailable?: number;
  /** Numero de secciones incluidas en la evidencia documental (por tarea o cruzada). */
  documentEvidenceCount?: number;
  /** Clasificacion de la pregunta respecto al documento fuente. */
  documentQuestionType?: DocumentQuestionType;
  /** Identificador de la seccion principal recuperada (ej. "6", "VII"). */
  documentPrimarySectionLabel?: string;
  /** Titulo de la seccion principal tal como se indexo del PDF. */
  documentPrimarySectionTitle?: string;
  /** Referencia lista para citar en prosa (ej. "6. Responsabilidades"). */
  documentPrimarySectionRef?: string;
  /**
   * true si la tarea esta en fase mixta y el extracto codigo_pr del PR no esta vacio.
   * Sirve para reforzar el prompt de analisis con reglas de evidencia tecnica del codigo.
   */
  codePrEvidenceActive?: boolean;
}

export interface ChatContext {
  mode: "general" | "tarea";
  /** Texto compacto para el modelo */
  contextText: string;
  promptMeta?: ChatPromptMeta;
}

export interface TareaContext {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta?: string | null;
  inicio?: string | null;
  fin?: string | null;
  completado?: boolean | null;
  estado?: string | null;
  created_at?: string | null;
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
