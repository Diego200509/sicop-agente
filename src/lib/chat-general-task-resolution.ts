import type { TareaContext } from "@/src/types/chat";

const STOP_WORDS = new Set([
  "a",
  "al",
  "algo",
  "analiza",
  "analizar",
  "como",
  "con",
  "costo",
  "costos",
  "cual",
  "cuales",
  "dame",
  "de",
  "del",
  "dime",
  "donde",
  "el",
  "en",
  "estado",
  "estimado",
  "estimados",
  "esa",
  "ese",
  "eso",
  "esta",
  "este",
  "estos",
  "ha",
  "hable",
  "hablame",
  "haz",
  "hay",
  "hora",
  "horas",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "me",
  "mi",
  "mis",
  "muy",
  "no",
  "nos",
  "o",
  "para",
  "por",
  "presupuesto",
  "presupuestario",
  "que",
  "quiero",
  "qué",
  "revisa",
  "revisar",
  "real",
  "se",
  "si",
  "sin",
  "sobre",
  "su",
  "sus",
  "tarea",
  "tareas",
  "te",
  "tengo",
  "tu",
  "tus",
  "un",
  "una",
  "uno",
  "unos",
  "vos",
  "y",
  "ya",
  "yo",
]);

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function extractKeywords(message: string): string[] {
  const norm = normalizeText(message);
  const parts = norm.split(" ").filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return [...new Set(parts)];
}

export type TaskForMatch = Pick<TareaContext, "id" | "id_tarea" | "titulo"> &
  Partial<Pick<TareaContext, "fase" | "descripcion" | "url_tarjeta">>;

function extractTechnicalIds(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];

  const ids = new Set<string>();
  for (const match of text.matchAll(/(?:^|\n)\s*(?:ID|Codigo|C[oó]digo)\s*:\s*([A-Z]{2,4}\d{1,3})\b/gi)) {
    if (match[1]) ids.add(match[1].toLowerCase());
  }
  for (const match of text.matchAll(/\b(PL|AR|DI|DS|QA|GP|CP)\d{1,3}\b/gi)) {
    if (match[0]) ids.add(match[0].toLowerCase());
  }

  return [...ids];
}

export type ScoredTask = {
  score: number;
  task: TaskForMatch;
};

export function scoreTaskMatch(message: string, task: TaskForMatch): number {
  let score = 0;
  const raw = message.trim();
  const normMsg = normalizeText(message);
  const idLower = task.id_tarea.trim().toLowerCase();
  const normTitle = normalizeText(task.titulo);
  const normPhase = normalizeText(task.fase ?? "");
  const normUrl = normalizeText(task.url_tarjeta ?? "");
  const technicalIds = extractTechnicalIds(`${task.id_tarea}\n${task.titulo}\n${task.descripcion ?? ""}`);
  const titleWords = normTitle.split(" ").filter((w) => w.length > 1);

  if (idLower.length >= 8 && raw.toLowerCase().includes(idLower)) {
    score += 500;
  }

  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  for (const m of raw.matchAll(uuidRe)) {
    if (m[0].toLowerCase() === idLower) score += 500;
  }

  const idNoDash = idLower.replace(/-/g, "");
  const msgCompact = normMsg.replace(/\s/g, "");
  if (idNoDash.length >= 8) {
    for (let len = Math.min(32, idNoDash.length); len >= 8; len -= 4) {
      const seg = idNoDash.slice(0, len);
      if (msgCompact.includes(seg)) {
        score += 400;
        break;
      }
    }
  }

  if (normTitle.length >= 4 && normMsg.includes(normTitle)) {
    score += 120;
  }

  for (const technicalId of technicalIds) {
    if (technicalId.length >= 3 && normMsg.split(" ").includes(technicalId)) {
      score += 500;
    }
  }

  if (normUrl.length >= 10 && normMsg.includes(normUrl)) {
    score += 500;
  }

  const keywords = extractKeywords(message);
  for (const kw of keywords) {
    if (kw.length < 3) continue;
    if (normTitle.includes(kw)) score += 18;
    if (normPhase.includes(kw)) score += 4;
    for (const tw of titleWords) {
      if (tw === kw) score += 25;
      else if (tw.length >= 4 && kw.length >= 4 && (tw.startsWith(kw) || kw.startsWith(tw))) score += 14;
    }
  }

  for (const tw of titleWords) {
    if (tw.length < 4) continue;
    if (normMsg.includes(tw)) score += 12;
  }

  const overlap = keywords.filter((k) => k.length >= 3 && titleWords.includes(k));
  if (overlap.length >= 2) score += overlap.length * 8;

  return score;
}

export type LocalResolution =
  | { kind: "single"; taskId: string }
  | { kind: "ambiguous"; titles: string[] }
  | { kind: "llm_candidates"; candidates: ScoredTask[] }
  | { kind: "none" };

export function findTaskByFlexibleMatch(message: string, tasks: TaskForMatch[]): LocalResolution {
  if (tasks.length === 0 || !message.trim()) {
    return { kind: "none" };
  }

  const scored: ScoredTask[] = tasks.map((task) => ({
    score: scoreTaskMatch(message, task),
    task,
  }));

  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.filter((s) => s.score > 0);
  if (ranked.length === 0) {
    return { kind: "none" };
  }

  const top = ranked[0]!;
  const second = ranked[1];

  if (top.score >= 500) {
    return { kind: "single", taskId: top.task.id };
  }

  if (!second) {
    if (top.score >= 22) return { kind: "single", taskId: top.task.id };
    if (top.score >= 10) return { kind: "llm_candidates", candidates: ranked.slice(0, 8) };
    if (top.score >= 5) return { kind: "llm_candidates", candidates: ranked.slice(0, 8) };
    return { kind: "none" };
  }

  const diff = top.score - second.score;

  if (top.score >= 40 && diff >= 12) {
    return { kind: "single", taskId: top.task.id };
  }

  if (top.score >= 22 && second.score >= 20 && diff < 10) {
    return {
      kind: "ambiguous",
      titles: ranked.slice(0, 3).map((s) => s.task.titulo),
    };
  }

  if (top.score >= 32 && diff >= 10) {
    return { kind: "single", taskId: top.task.id };
  }

  if (top.score >= 24 && diff >= 8) {
    return { kind: "single", taskId: top.task.id };
  }

  if (top.score >= 18 && second.score >= 16 && diff < 8) {
    return {
      kind: "ambiguous",
      titles: ranked.slice(0, 3).map((s) => s.task.titulo),
    };
  }

  if (top.score >= 18 && diff >= 7) {
    return { kind: "single", taskId: top.task.id };
  }

  if (top.score >= 14 && diff >= 6) {
    return { kind: "single", taskId: top.task.id };
  }

  if (top.score >= 12 && second.score >= 10 && diff < 5) {
    return {
      kind: "ambiguous",
      titles: ranked.slice(0, 3).map((s) => s.task.titulo),
    };
  }

  if (top.score >= 8) {
    return { kind: "llm_candidates", candidates: ranked.slice(0, 8) };
  }

  if (top.score >= 5) {
    return { kind: "llm_candidates", candidates: ranked.slice(0, 8) };
  }

  return { kind: "none" };
}
