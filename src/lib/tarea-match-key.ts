export function normalizeForTareaMerge(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Comparación tolerante si quedan diferencias de espacio entre títulos iguales. */
export function fingerprintTituloFase(titulo: string, fase: string): string {
  return `${normalizeForTareaMerge(titulo).replace(/\s/g, "")}::${normalizeForTareaMerge(fase).replace(/\s/g, "")}`;
}

export function buildMergeKey(titulo: string, fase: string): string {
  const t = normalizeForTareaMerge(titulo);
  const f = normalizeForTareaMerge(fase);
  return `${t}|||${f}`;
}

export function buildMergeKeyPreferTech(titulo: string, fase: string, descripcion: string): string {
  const tech = extractTechnicalTaskIdFromDescripcion(descripcion);
  if (tech) {
    return `${normalizeForTareaMerge(tech)}|||${normalizeForTareaMerge(fase)}`;
  }
  return buildMergeKey(titulo, fase);
}

export function extractTechnicalTaskIdFromDescripcion(descripcion: string): string | null {
  if (!descripcion?.trim()) return null;
  const byLine = descripcion.match(/^\s*ID:\s*([A-Za-z0-9_-]+)/im);
  if (byLine?.[1]) return byLine[1].trim();
  /** Alineado con SQL `regexp_match(..., 'ID:\s*([A-Za-z0-9_-]+)', 'i')`: primera aparición en el texto. */
  const anywhere = descripcion.match(/ID:\s*([A-Za-z0-9_-]+)/i);
  if (anywhere?.[1]) return anywhere[1].trim();
  const quoted = descripcion.match(/Usar\s+["']([A-Za-z0-9_-]+)["']/i);
  if (quoted?.[1]) return quoted[1].trim();
  return null;
}
