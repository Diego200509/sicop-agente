/**
 * Hoy `tareas.url_tarjeta` mezcla URL completa de Trello (flujo documental) e identificadores
 * cortos de tarjeta (flujo código / n8n). La lógica de `chooseBestUrlTarjeta` evita pisar una URL
 * http(s) válida con un id que no es URL.
 *
 * A futuro convendría separar en esquema:
 * - `url_tarjeta` (solo https://trello.com/... o null)
 * - `trello_card_id` (short id / id interno para búsquedas)
 * sin romper payloads actuales de n8n.
 */

export function isHttpUrl(value: string | null | undefined): boolean {
  const s = value?.trim() ?? "";
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Reglas:
 * 1. Si `current` es URL http(s) y `incoming` no lo es → conservar `current`.
 * 2. Si `current` vacío y `incoming` es URL http(s) válida → usar `incoming`.
 * 3. Si ambas son URL http(s) válidas → conservar `current`.
 * 4. Si ninguna es URL http(s) válida → conservar `current` si existe; si no, `incoming`.
 */
export function chooseBestUrlTarjeta(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const c = (current ?? "").trim();
  const i = (incoming ?? "").trim();
  const curOk = isHttpUrl(c);
  const incOk = isHttpUrl(i);

  if (curOk && !incOk) {
    return c.length > 0 ? c : null;
  }
  if (incOk && !curOk) {
    return i.length > 0 ? i : null;
  }
  if (curOk && incOk) {
    return c.length > 0 ? c : null;
  }
  if (c.length > 0) {
    return c;
  }
  if (i.length > 0) {
    return i;
  }
  return null;
}
