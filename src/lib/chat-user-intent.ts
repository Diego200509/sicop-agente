import { normalizeText } from "@/src/lib/chat-general-task-resolution";
import type { ChatUserIntent } from "@/src/types/chat";

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
