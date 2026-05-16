import { normalizeText } from "@/src/lib/chat-general-task-resolution";
import type { ChatQuestionKind, ChatUserIntent } from "@/src/types/chat";

const ANALISIS_SUBSTRINGS = [
  "analiza",
  "analizar",
  "evaluar",
  "cumplimiento",
  "revision",
  "revisa",
  "revisar",
  "compara",
  "comparar",
  "auditoria",
  "estado del proyecto",
] as const;

function hasAnalisisIntent(normalizedMessage: string): boolean {
  for (const s of ANALISIS_SUBSTRINGS) {
    if (normalizedMessage.includes(s)) return true;
  }
  return false;
}

/** Palabras conversacionales (texto normalizado, sin acentos). */
const CONVERSATIONAL_WORDS = new Set(["hola", "gracias", "ok", "listo", "entendido"]);

function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((w) => w.length > 0);
}

function hasConversationalIntent(normalizedMessage: string): boolean {
  const tokens = tokenize(normalizedMessage);
  if (tokens.length === 0) return false;
  // Frases muy cortas sin señales de consulta técnica suelen ser saludo o cierre.
  if (normalizedMessage.length <= 18 && tokens.length <= 3) {
    if (tokens.every((t) => CONVERSATIONAL_WORDS.has(t) || t.length <= 2)) {
      return true;
    }
  }
  for (const t of tokens) {
    if (CONVERSATIONAL_WORDS.has(t)) return true;
  }
  return false;
}

/**
 * Clasifica la intencion del mensaje para ajustar el formato de respuesta del chat.
 *
 * Orden efectivo (por criterios de aceptacion):
 * 1. Analisis — si hay palabras clave de analisis/evaluacion/comparacion/auditoria.
 * 2. Conversacional — saludos, agradecimientos, confirmaciones breves.
 * 3. Consulta — por defecto (preguntas directas sin pedir analisis formal).
 */
export function detectUserIntent(message: string): ChatUserIntent {
  const trimmed = message.trim();
  if (!trimmed) return "consulta";

  const norm = normalizeText(trimmed);
  if (hasAnalisisIntent(norm)) return "analisis";
  if (hasConversationalIntent(norm)) return "conversacional";
  return "consulta";
}

function includesAny(normalizedMessage: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => normalizedMessage.includes(pattern));
}

export function detectQuestionKind(message: string): ChatQuestionKind {
  const norm = normalizeText(message.trim());
  if (!norm) return "general";

  if (
    includesAny(norm, [
      "ultimo reporte",
      "ultimo informe",
      "que dice el reporte",
      "reporte de seguimiento",
      "reporte automatico",
      "reporte ia",
      "reporte n8n",
    ])
  ) {
    return "latest_report";
  }

  if (
    includesAny(norm, [
      "presupuesto",
      "presupuestario",
      "sobrecosto",
      "costo real",
      "costo estimado",
      "saldo disponible",
      "ejecucion presupuestaria",
      "variacion costo",
      "fase consume",
    ])
  ) {
    return "budget";
  }

  if (
    includesAny(norm, [
      "kpi",
      "kpis",
      "indicadores",
      "cumplimiento cronograma",
      "tasa de defectos",
      "productividad",
      "cumplimiento requerimientos",
      "eficiencia de flujo",
    ])
  ) {
    return "kpis";
  }

  if (
    includesAny(norm, [
      "recomendacion",
      "recomendaciones",
      "sugerencia",
      "sugerencias",
      "proximas acciones",
      "prÃ³ximas acciones",
    ])
  ) {
    return "recommendations";
  }

  if (
    includesAny(norm, [
      "cuantas tareas",
      "cuantos tareas",
      "tareas en curso",
      "tareas proximas",
      "tareas prÃ³ximas",
      "tareas completadas",
      "tareas en plazo",
      "tareas sin fecha",
      "cuantas estan en curso",
      "cuantas estan completadas",
    ])
  ) {
    return "task_status_counts";
  }

  if (
    includesAny(norm, [
      "resumen ejecutivo",
      "modo ejecutivo",
      "dame resumen ejecutivo",
      "informe ejecutivo",
      "vision ejecutiva",
    ])
  ) {
    return "executive_summary";
  }

  if (
    includesAny(norm, [
      "prioridad",
      "prioridades",
      "ranking",
      "urgencia",
      "urgente",
      "criticas",
      "criticos",
      "mas importante",
    ])
  ) {
    return "priority_ranking";
  }

  if (
    includesAny(norm, [
      "atrasado",
      "atrasadas",
      "atrasados",
      "vencida",
      "vencidas",
      "vencido",
      "vencidos",
      "fuera de plazo",
      "retraso",
      "retrasadas",
      "retrasados",
    ])
  ) {
    return "overdue";
  }

  if (
    includesAny(norm, [
      "riesgo",
      "riesgos",
      "bloqueo",
      "bloqueos",
      "problema",
      "problemas",
      "alerta",
      "alertas",
    ])
  ) {
    return "risks";
  }

  if (
    includesAny(norm, [
      "que falta",
      "qué falta",
      "faltante",
      "faltantes",
      "pendiente",
      "pendientes",
      "incompleto",
      "incompletos",
      "sin fecha",
      "sin enlace",
      "sin revision",
      "sin revisión",
    ])
  ) {
    return "missing_work";
  }

  if (
    includesAny(norm, [
      "como va",
      "cómo va",
      "avance",
      "estado general",
      "estado del proyecto",
      "situacion del proyecto",
      "situación del proyecto",
      "progreso",
    ])
  ) {
    return "project_status";
  }

  if (
    includesAny(norm, [
      "que tareas hay",
      "qué tareas hay",
      "lista de tareas",
      "listar tareas",
      "muestrame las tareas",
      "muéstrame las tareas",
      "tareas registradas",
      "ver tareas",
    ])
  ) {
    return "task_list";
  }

  return "general";
}
