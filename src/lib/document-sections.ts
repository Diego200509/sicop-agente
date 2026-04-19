import { normalizeText } from "@/src/lib/chat-general-task-resolution";
import type { ChatUserIntent } from "@/src/types/chat";

export type DocumentQuestionType = "specific" | "general" | "none";

export type DocumentSection = {
  id: string;
  title: string;
  body: string;
};

/** Referencia para citar en prosa la seccion principal (trazabilidad académica). */
export type DocumentPrimaryCitation = {
  /** Identificador de seccion (ej. "6", "VII", "3.1") */
  label: string;
  /** Titulo tal como se indexo en el parser */
  title: string;
  /** Cita compacta (ej. "6. Responsabilidades", "VII. Reglas de Negocio") */
  ref: string;
};

/**
 * Normaliza id + titulo a una referencia legible para el modelo (sin inventar datos nuevos).
 */
export function formatSectionCitationForProse(id: string, rawTitle: string): string {
  const idNorm = id.trim();
  const t = rawTitle.trim();
  if (!t) return idNorm;
  const tl = t.toLowerCase();
  const il = idNorm.toLowerCase();
  if (tl === il) return idNorm;
  if (tl.startsWith(`${il}.`) || tl.startsWith(`${il} `) || tl.startsWith(`${il}—`) || tl.startsWith(`${il}-`)) {
    const stripped = t.slice(idNorm.length).replace(/^[\s.:-—]+/, "").trim();
    if (!stripped) return idNorm;
    return `${idNorm}. ${stripped}`;
  }
  return `${idNorm}. ${t}`;
}

export function buildPrimarySectionCitation(section: DocumentSection): DocumentPrimaryCitation {
  const label = section.id.trim();
  const title = section.title.trim();
  const ref = formatSectionCitationForProse(label, title);
  return { label, title, ref };
}

const SPECIFIC_TRIGGERS = [
  "quien",
  "quienes",
  "que dice",
  "cual es",
  "cuales son",
  "donde dice",
  "menciona",
  "mencionan",
  "textualmente",
  "objetivo",
  "alcance",
  "definicion",
  "definiciones",
  "normativa",
  "requerimiento",
  "funcional",
  "no funcional",
  "reglas de negocio",
  "regla de negocio",
  "validacion",
  "validación",
  "control de cambios",
  "anexo",
  "anexos",
  "responsable",
  "responsabilidades",
  "firmas",
  "seccion",
  "sección",
  "punto",
  "apartado",
  "item",
  "ítem",
  "inciso",
  "documento",
  "pdf",
  "contenido del",
  "habla de",
  "indica el",
];

function hasSpecificTrigger(norm: string): boolean {
  return SPECIFIC_TRIGGERS.some((t) => norm.includes(t));
}

/**
 * Clasifica si la pregunta apunta a contenido puntual del documento fuente.
 */
export function classifyDocumentQuestion(
  message: string,
  intent: ChatUserIntent,
): DocumentQuestionType {
  const norm = normalizeText(message);
  if (!norm.trim()) return "none";
  if (hasSpecificTrigger(norm)) return "specific";
  if (intent === "analisis") return "general";
  return "none";
}

export function shouldAttemptDocumentRetrieval(
  intent: ChatUserIntent,
  questionType: DocumentQuestionType,
): boolean {
  if (intent === "conversacional") return false;
  return questionType !== "none";
}

/** Heuristica para buscar evidencia cruzada entre varias tareas (chat general amplio). */
export function shouldAttemptCrossTaskDocumentEvidence(message: string, intent: ChatUserIntent): boolean {
  if (intent === "conversacional") return false;
  const norm = normalizeText(message.trim());
  if (!norm.trim()) return false;
  const broadHints = [
    "que tareas",
    "qué tareas",
    "cuales tareas",
    "cuáles tareas",
    "en que tareas",
    "en qué tareas",
    "que documentos",
    "qué documentos",
    "hablan de",
    "mencionan",
    "tienen requerimiento",
    "tienen normativa",
    "menciona normativa",
    "menciona el documento",
  ];
  if (broadHints.some((h) => norm.includes(h))) return true;
  return hasSpecificTrigger(norm);
}

const ROMAN_HEADER = /^\s{0,4}([IVXLC]{1,8})\s*[.)]\s+(.{1,220})$/i;

function isPlausibleRomanSectionId(r: string): boolean {
  const u = r.toUpperCase();
  if (u.length < 1 || u.length > 8) return false;
  return /^[IVXLC]+$/.test(u) && /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)$/i.test(u);
}

const NUMBERED_HEADER =
  /^\s{0,4}(\d{1,2}(?:\.\d{1,3}){0,3})\s*[.)—\-:]\s*(.{1,220})$/;

const SECTION_WORD_HEADER =
  /^\s{0,4}(SECCI(?:ON|ÓN)|CAP[IÍ]TULO|CAPITULO|APARTADO)\s+([IVX\d.]+)[\s:.\-—]*(.{0,200})$/i;

/**
 * Parte el texto extraido del PDF en secciones por encabezados tipicos de documentos de ingenieria.
 * Si no detecta estructura, devuelve un unico bloque con el texto acotado para indexacion.
 */
export function parseDocumentSections(raw: string, maxScanChars = 120_000): DocumentSection[] {
  const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const slice = text.length > maxScanChars ? text.slice(0, maxScanChars) : text;
  const lines = slice.split("\n");

  type Marker = { lineIndex: number; id: string; title: string };
  const markers: Marker[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmedLine = line.trim();
    if (trimmedLine.length < 3 || trimmedLine.length > 260) continue;

    let m = trimmedLine.match(NUMBERED_HEADER);
    if (m?.[1] && m[2]) {
      markers.push({ lineIndex: i, id: m[1].trim(), title: `${m[1].trim()} ${m[2].trim()}`.trim() });
      continue;
    }

    m = trimmedLine.match(ROMAN_HEADER);
    if (m?.[1] && m[2] && isPlausibleRomanSectionId(m[1])) {
      markers.push({
        lineIndex: i,
        id: m[1].toUpperCase().trim(),
        title: `${m[1].toUpperCase().trim()}. ${m[2].trim()}`.trim(),
      });
      continue;
    }

    m = trimmedLine.match(SECTION_WORD_HEADER);
    if (m?.[2]) {
      const id = String(m[2]).trim();
      const rest = (m[3] ?? "").trim();
      markers.push({
        lineIndex: i,
        id,
        title: rest ? `${m[1]} ${id} — ${rest}` : `${m[1]} ${id}`,
      });
    }
  }

  if (markers.length === 0) {
    return [
      {
        id: "1",
        title: "Documento (sin encabezados detectados)",
        body: slice,
      },
    ];
  }

  const sections: DocumentSection[] = [];
  for (let k = 0; k < markers.length; k++) {
    const start = markers[k]!.lineIndex;
    const endLine = k + 1 < markers.length ? markers[k + 1]!.lineIndex : lines.length;
    const bodyLines = lines.slice(start + 1, endLine);
    const body = bodyLines.join("\n").trim();
    const headerLine = lines[start] ?? "";
    sections.push({
      id: markers[k]!.id,
      title: markers[k]!.title || headerLine.trim(),
      body: body.length > 0 ? body : headerLine.trim(),
    });
  }

  return sections;
}

type RuleBoost = {
  name: string;
  when: (normQ: string) => boolean;
  boost: (sec: DocumentSection, _normQ: string) => number;
};

function sectionIdPrefixMatches(secId: string, prefix: string): boolean {
  const a = secId.toLowerCase().replace(/\s+/g, "");
  const b = prefix.toLowerCase().replace(/\s+/g, "");
  return a === b || a.startsWith(`${b}.`) || a.startsWith(b);
}

const RULES: RuleBoost[] = [
  {
    name: "responsables",
    when: (q) =>
      /responsable|responsabilidad|quien firma|firmas de responsabilidad|firma de responsabilidad/.test(q),
    boost: (s) =>
      /6\b|responsabilidad|responsable|firma/i.test(`${s.id} ${s.title}`) || /\b6[.)]\s|seis\b/i.test(s.title)
        ? 120
        : 0,
  },
  {
    name: "alcance",
    when: (q) => q.includes("alcance"),
    boost: (s) => (/^4\b|alcance/i.test(`${s.id} ${s.title}`) ? 120 : 0),
  },
  {
    name: "objetivo_general",
    when: (q) => q.includes("objetivo general") || (q.includes("objetivo") && q.includes("general")),
    boost: (s) => (/3\.1|^3\b.*general|objetivo general/i.test(`${s.id} ${s.title}`) ? 130 : 0),
  },
  {
    name: "objetivos_especificos",
    when: (q) => q.includes("objetivo") && (q.includes("especifico") || q.includes("específico")),
    boost: (s) => (/3\.2|especifico|específico/i.test(`${s.id} ${s.title}`) ? 130 : 0),
  },
  {
    name: "definiciones",
    when: (q) => q.includes("definicion") || q.includes("definiciones"),
    boost: (s) => (/^5\b|definicion/i.test(`${s.id} ${s.title}`) ? 110 : 0),
  },
  {
    name: "normativa",
    when: (q) => q.includes("normativa") || q.includes("legal y tecnica") || q.includes("legal y técnica"),
    boost: (s) => (/^7\b|normativa|legal/i.test(`${s.id} ${s.title}`) ? 120 : 0),
  },
  {
    name: "req_funcionales",
    when: (q) =>
      (q.includes("requerimiento") && q.includes("funcional")) ||
      q.includes("requerimientos funcionales") ||
      /req\.?\s*funcional/.test(q),
    boost: (s) =>
      /^v$/i.test(String(s.id).trim()) ||
      /funcional/i.test(`${s.id} ${s.title}`) ||
      /requerimientos funcionales/i.test(`${s.id} ${s.title}`)
        ? 140
        : 0,
  },
  {
    name: "req_no_funcionales",
    when: (q) =>
      (q.includes("no funcional") || q.includes("no-funcional") || q.includes("no funcionales")) &&
      q.includes("requerimiento"),
    boost: (s) => (/^vi$/i.test(String(s.id).trim()) || /no funcional/i.test(`${s.id} ${s.title}`) ? 140 : 0),
  },
  {
    name: "reglas_negocio",
    when: (q) => q.includes("regla") && q.includes("negocio"),
    boost: (s) =>
      /^vii$/i.test(String(s.id).trim()) || /reglas de negocio|regla de negocio/i.test(`${s.id} ${s.title}`)
        ? 140
        : 0,
  },
  {
    name: "validacion",
    when: (q) => q.includes("validacion") || q.includes("validación"),
    boost: (s) =>
      /^viii$/i.test(String(s.id).trim()) || /validacion|validación/i.test(`${s.id} ${s.title}`) ? 130 : 0,
  },
  {
    name: "control_cambios",
    when: (q) => q.includes("control de cambios") || q.includes("historial de cambios"),
    boost: (s) => (/^10\b|control de cambios/i.test(`${s.id} ${s.title}`) ? 110 : 0),
  },
  {
    name: "anexos",
    when: (q) => q.includes("anexo") || q.includes("anexos"),
    boost: (s) => (/^11\b|anexo/i.test(`${s.id} ${s.title}`) ? 110 : 0),
  },
];

function explicitNumberFromQuestion(normQ: string): string | null {
  const m1 = normQ.match(/(?:punto|apartado|p|item|ítem|inciso|numero|número)\s*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (m1?.[1]) return m1[1];
  const m2 = normQ.match(/secci(?:o|ó)n\s*(\d{1,2})/i);
  if (m2?.[1]) return m2[1];
  return null;
}

function explicitRomanFromQuestion(normQ: string): string | null {
  const m = normQ.match(/secci(?:o|ó)n\s*([ivxlc]{1,8})\b/i);
  if (m?.[1] && isPlausibleRomanSectionId(m[1])) return m[1].toUpperCase();
  return null;
}

function keywordOverlapScore(normQ: string, sec: DocumentSection): number {
  const qw = normQ.split(" ").filter((w) => w.length >= 4);
  if (qw.length === 0) return 0;
  const hay = normalizeText(`${sec.id} ${sec.title} ${sec.body.slice(0, 1200)}`);
  let score = 0;
  for (const w of qw) {
    if (hay.includes(w)) score += 6;
  }
  return score;
}

export type FindSectionsOptions = {
  maxSections?: number;
  maxCharsPerSection?: number;
  maxTotalChars?: number;
  minScore?: number;
};

/**
 * Selecciona las secciones del documento mas alineadas con la pregunta (reglas + solapamiento lexico).
 */
export function findRelevantDocumentSections(
  question: string,
  sections: DocumentSection[],
  options: FindSectionsOptions = {},
): { sections: DocumentSection[]; matchedHints: string[] } {
  const maxSections = options.maxSections ?? 3;
  const maxCharsPerSection = options.maxCharsPerSection ?? 2800;
  const maxTotalChars = options.maxTotalChars ?? 6000;
  const minScore = options.minScore ?? 18;

  if (sections.length === 0) return { sections: [], matchedHints: [] };

  const normQ = normalizeText(question);

  const explicitNum = explicitNumberFromQuestion(normQ);
  const explicitRom = explicitRomanFromQuestion(normQ);

  const scored = sections.map((sec) => {
    let score = keywordOverlapScore(normQ, sec);

    for (const rule of RULES) {
      if (rule.when(normQ)) {
        const b = rule.boost(sec, normQ);
        if (b > 0) score += b;
      }
    }

    if (explicitNum && sectionIdPrefixMatches(sec.id, explicitNum)) {
      score += 200;
    }
    if (explicitRom && sec.id.toUpperCase() === explicitRom) {
      score += 200;
    }

    return { sec, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: DocumentSection[] = [];
  let total = 0;
  const seen = new Set<string>();

  for (const { sec, score } of scored) {
    if (score < minScore) break;
    const key = `${sec.id}::${sec.title.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const body =
      sec.body.length > maxCharsPerSection ? `${sec.body.slice(0, maxCharsPerSection)}…` : sec.body;
    const truncated: DocumentSection = { ...sec, body };
    const addLen = sec.title.length + body.length + 40;
    if (total + addLen > maxTotalChars && picked.length > 0) break;

    picked.push(truncated);
    total += addLen;
    if (picked.length >= maxSections) break;
  }

  function hintsForPicked(pickedSecs: DocumentSection[]): string[] {
    const hintSet = new Set<string>();
    for (const p of pickedSecs) {
      for (const rule of RULES) {
        if (rule.when(normQ) && rule.boost(p, normQ) > 0) hintSet.add(rule.name);
      }
      if (explicitNum && sectionIdPrefixMatches(p.id, explicitNum)) hintSet.add(`explicit_num:${explicitNum}`);
      if (explicitRom && p.id.toUpperCase() === explicitRom) hintSet.add(`explicit_roman:${explicitRom}`);
    }
    return [...hintSet];
  }

  if (picked.length === 0 && sections.length > 0) {
    const fallback = scored[0];
    if (fallback && fallback.score > 0) {
      const sec = fallback.sec;
      const body = sec.body.length > maxCharsPerSection ? `${sec.body.slice(0, maxCharsPerSection)}…` : sec.body;
      const one = [{ ...sec, body }];
      return {
        sections: one,
        matchedHints: [...hintsForPicked(one), "fallback_best_overlap"],
      };
    }
  }

  return { sections: picked, matchedHints: hintsForPicked(picked) };
}

/**
 * Bloque Markdown para el contexto del modelo (texto fuente recuperado).
 */
export function buildDocumentEvidenceBlock(
  sections: DocumentSection[],
  opts?: { matchedHints?: string[] },
): string {
  if (sections.length === 0) return "";

  const hints =
    opts?.matchedHints && opts.matchedHints.length
      ? `\n(Criterios de coincidencia aproximados: ${[...new Set(opts.matchedHints)].slice(0, 8).join(", ")}.)`
      : "";

  const parts = [
    "## Evidencia documental relevante",
    "Fragmentos recuperados del texto fuente (PDF). Prioriza esta evidencia frente a inferencias o resumenes si la pregunta es puntual sobre el documento.",
    `No inventes nombres, listas ni requisitos que no aparezcan aqui o en el resto del contexto.${hints}`,
    "",
  ];

  for (const s of sections) {
    parts.push(`### Seccion ${s.id} — ${s.title}`, "```texto_documento", s.body, "```", "");
  }

  return parts.join("\n");
}

export function buildCrossTaskDocumentEvidenceBlock(
  items: Array<{ tareaLabel: string; sections: DocumentSection[]; hints: string[] }>,
  maxTotalChars: number,
): string {
  if (items.length === 0) return "";
  const parts = [
    "## Evidencia documental cruzada (varias tareas)",
    "Extractos breves del texto fuente por tarea. No extrapoles entre tareas; cada bloque aplica solo a su tarjeta.",
    "",
  ];
  let used = 0;
  for (const it of items) {
    if (it.sections.length === 0) continue;
    const sec = it.sections[0]!;
    const chunk = [
      `### ${it.tareaLabel}`,
      `> Seccion ${sec.id}: ${sec.title}`,
      "```texto_documento",
      sec.body,
      "```",
      "",
    ].join("\n");
    if (used + chunk.length > maxTotalChars) break;
    parts.push(chunk);
    used += chunk.length;
  }
  if (parts.length <= 4) return "";
  return parts.join("\n");
}

export type DocumentEvidenceResult = {
  block: string;
  questionType: DocumentQuestionType;
  count: number;
  /** Presente cuando hay al menos una seccion recuperada (la principal es la primera por relevancia). */
  primaryCitation?: DocumentPrimaryCitation;
};

/**
 * Parsea el PDF, selecciona secciones y arma el bloque de evidencia para el contexto del modelo.
 */
export function extractDocumentEvidenceForQuestion(
  question: string,
  intent: ChatUserIntent,
  textoPdf: string | null | undefined,
  limits?: FindSectionsOptions,
): DocumentEvidenceResult {
  const questionType = classifyDocumentQuestion(question, intent);
  if (!shouldAttemptDocumentRetrieval(intent, questionType) || !textoPdf?.trim()) {
    return { block: "", questionType, count: 0 };
  }

  const sections = parseDocumentSections(textoPdf);
  const { sections: picked, matchedHints } = findRelevantDocumentSections(question, sections, limits ?? {});
  if (picked.length === 0) {
    return { block: "", questionType, count: 0 };
  }

  const primaryCitation = buildPrimarySectionCitation(picked[0]!);

  return {
    block: buildDocumentEvidenceBlock(picked, { matchedHints }),
    questionType,
    count: picked.length,
    primaryCitation,
  };
}
