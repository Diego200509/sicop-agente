import { HTMLElement, parse } from "node-html-parser";

import { normalizeText } from "@/src/lib/chat-general-task-resolution";
import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";

/** Títulos de sección reales (p. ej. en PDF/correo) — incluye variantes sin "de IA". */
const ACTIONABLE_SECTION_PATTERNS = [
  /sugerencias?\s+accionables?\s+de\s+ia/i,
  /sugerencias?\s+accionables?/i,
];

/**
 * Solo se usa para saber si el HTML ya trae el bloque de sugerencias accionables.
 * NO usar el patrón corto: el texto introductorio del reporte suele decir
 * "sugerencias accionables" en una frase y eso no es la sección de la IA.
 */
const HTML_EMBEDDED_ACTIONABLE_SECTION_PATTERNS = [
  /sugerencias?\s+accionables?\s+de\s+ia/i,
];

const NEXT_SECTION_PATTERNS = [
  /^riesgos\s+detectados/i,
  /^sugerencias\s+concretas\s+para\s+el\s+gestor/i,
  /^proximas\s+acciones\s+recomendadas/i,
  /^pr[oó]ximas\s+acciones\s+recomendadas/i,
  /^tareas\s+completadas/i,
  /^tareas\s+en\s+curso/i,
  /^tareas\s+pr[oó]ximas/i,
  /^tareas\s+atrasadas/i,
  /^tareas\s+sin\s+fecha/i,
  /^indicadores\s+clave/i,
];

type ActionableSuggestion = {
  titulo?: string;
  card_titulo?: string;
  fase?: string;
  descripcion?: string;
  accion_tipo?: string;
  label_name?: string;
  comentario_sugerido?: string;
  fecha_sugerida?: string;
};

export function resolveSentReportHtml(reporte: ReporteSeguimiento): string | null {
  const emailHtml = reporte.mensaje_html?.trim() ?? "";
  const pdfHtml = reporte.html_reporte?.trim() ?? "";
  const suggestions = getActionableSuggestionsFromMetadata(reporte.metadata);
  const suggestionsBlock = suggestions.length > 0 ? buildActionableSuggestionsHtml(suggestions) : null;

  if (emailHtml && htmlContainsActionableSuggestions(emailHtml)) {
    return emailHtml;
  }

  if (emailHtml && suggestionsBlock) {
    return appendSuggestionsBlock(emailHtml, suggestionsBlock);
  }

  if (emailHtml) {
    return emailHtml;
  }

  if (pdfHtml && suggestionsBlock) {
    return appendSuggestionsBlock(pdfHtml, suggestionsBlock);
  }

  return pdfHtml || null;
}

export function stripActionableSuggestionsFromHtml(html: string): string {
  if (!html.trim()) return html;

  const root = parse(html);
  const container = root.querySelector("body") ?? root;

  removeActionableSections(container);
  removeActionableWidgets(container);

  return container.toString();
}

export function htmlContainsActionableSuggestions(html: string): boolean {
  if (/\bsugerencias-accionables-ia\b/i.test(html)) return true;

  const normalized = normalizeText(html.replace(/<[^>]+>/g, " "));
  return HTML_EMBEDDED_ACTIONABLE_SECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function resolvePdfAndEmailHtml(payload: {
  html?: string;
  mensaje_html?: string;
  mensaje_html_pdf?: string;
}): { pdfHtml: string; mensajeHtml: string | null } {
  const explicitEmail = typeof payload.mensaje_html === "string" ? payload.mensaje_html.trim() : "";
  const rawPdfSource = (
    typeof payload.mensaje_html_pdf === "string" ? payload.mensaje_html_pdf : payload.html ?? ""
  ).trim();

  if (!rawPdfSource && !explicitEmail) {
    return { pdfHtml: "", mensajeHtml: null };
  }

  const pdfHtml = stripActionableSuggestionsFromHtml(rawPdfSource || explicitEmail);

  if (explicitEmail) {
    return { pdfHtml, mensajeHtml: explicitEmail };
  }

  if (htmlContainsActionableSuggestions(rawPdfSource)) {
    return { pdfHtml, mensajeHtml: rawPdfSource };
  }

  return { pdfHtml, mensajeHtml: null };
}

export function getActionableSuggestionsFromMetadata(metadata: ReporteSeguimiento["metadata"]): ActionableSuggestion[] {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) return [];

  const raw = (metadata as Record<string, unknown>).sugerencias_accionables;
  if (!Array.isArray(raw)) return [];

  return raw.filter((item): item is ActionableSuggestion => item != null && typeof item === "object" && !Array.isArray(item));
}

function buildActionableSuggestionsHtml(suggestions: ActionableSuggestion[]): string {
  if (suggestions.length === 0) return "";

  const cards = suggestions
    .map((suggestion) => {
      const taskTitle = escapeHtml(suggestion.card_titulo ?? suggestion.titulo ?? "Tarea sin titulo");
      const description = escapeHtml(suggestion.descripcion ?? "Sin descripcion");
      const phase = suggestion.fase ? `<p><strong>Fase:</strong> ${escapeHtml(suggestion.fase)}</p>` : "";
      const actionType = suggestion.accion_tipo ? `<p><strong>Accion:</strong> ${escapeHtml(suggestion.accion_tipo)}</p>` : "";
      const label = suggestion.label_name ? `<p><strong>Etiqueta:</strong> ${escapeHtml(suggestion.label_name)}</p>` : "";
      const comment = suggestion.comentario_sugerido
        ? `<p><strong>Comentario sugerido:</strong> ${escapeHtml(suggestion.comentario_sugerido)}</p>`
        : "";
      const dueDate = suggestion.fecha_sugerida
        ? `<p><strong>Fecha sugerida:</strong> ${escapeHtml(suggestion.fecha_sugerida)}</p>`
        : "";

      return `
        <div class="sugerencia-accionable" style="border:1px solid #dbe3ef;border-radius:10px;padding:14px;margin:12px 0;background:#f8fafc;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f2a44;">${taskTitle}</p>
          <p style="margin:0 0 10px;color:#475569;">${description}</p>
          ${phase}
          ${actionType}
          ${label}
          ${comment}
          ${dueDate}
          <div style="display:flex;gap:10px;margin-top:12px;">
            <span style="display:inline-block;padding:8px 14px;border-radius:8px;background:#16a34a;color:#fff;font-weight:600;">Aprobar acción</span>
            <span style="display:inline-block;padding:8px 14px;border-radius:8px;background:#dc2626;color:#fff;font-weight:600;">Descartar</span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="sugerencias-accionables-ia" style="margin-top:0;">
      <h2 style="margin:26px 0 14px;font-size:21px;color:#0f2747;border-bottom:2px solid #38bdf8;padding-bottom:8px;">Sugerencias accionables de IA</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.5;">Estas sugerencias se muestran en el correo enviado por Gmail y pueden aprobarse o descartarse desde el flujo de n8n.</p>
      ${cards}
    </section>
  `;
}

function isProximasAccionesHeading(value: string): boolean {
  const n = normalizeText(value);
  return n.startsWith("proximas acciones recomendadas");
}

/**
 * Lista (ul/ol) bajo el título "Próximas acciones recomendadas", o el propio título si no hay lista.
 */
function findProximasAccionesInsertionAnchor(container: HTMLElement): HTMLElement | null {
  const headings = container.querySelectorAll("h1,h2,h3,h4,h5,h6");

  for (const heading of headings) {
    if (!isProximasAccionesHeading(heading.text)) continue;

    let el: HTMLElement | null = heading.nextElementSibling;
    while (el) {
      if (/^h[1-6]$/i.test(el.tagName)) break;
      const tag = el.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        return el;
      }
      el = el.nextElementSibling;
    }

    return heading;
  }

  return null;
}

/** Separador típico antes del pie "Este correo fue generado..." en plantillas n8n. */
function findPreFooterHr(container: HTMLElement): HTMLElement | null {
  for (const hr of container.querySelectorAll("hr")) {
    const style = hr.getAttribute("style") ?? "";
    if (/d6dee8/i.test(style) || /34px\s+0\s+24px/i.test(style)) {
      return hr;
    }
  }
  return null;
}

function appendSuggestionsBlock(baseHtml: string, suggestionsBlock: string): string {
  const trimmed = baseHtml.trim();
  if (!trimmed) return suggestionsBlock.trim();

  try {
    const root = parse(trimmed);
    const container = root.querySelector("body") ?? root;

    const proximasAnchor = findProximasAccionesInsertionAnchor(container);
    if (proximasAnchor) {
      proximasAnchor.insertAdjacentHTML("afterend", suggestionsBlock);
      return root.toString();
    }

    const preFooterHr = findPreFooterHr(container);
    if (preFooterHr) {
      preFooterHr.insertAdjacentHTML("beforebegin", suggestionsBlock);
      return root.toString();
    }
  } catch {
    // Continuar con respaldo al final del documento
  }

  if (/<\/body>/i.test(trimmed)) {
    return trimmed.replace(/<\/body>/i, `${suggestionsBlock}</body>`);
  }

  return `${trimmed}\n${suggestionsBlock}`;
}

function removeActionableSections(container: HTMLElement) {
  const headings = container.querySelectorAll("h1,h2,h3,h4,h5,h6");

  for (const heading of headings) {
    if (!isActionableSectionTitle(heading.text)) continue;

    let sibling = heading.nextElementSibling;
    heading.remove();

    while (sibling) {
      if (sibling instanceof HTMLElement && /^h[1-6]$/i.test(sibling.tagName) && isKnownNextSectionTitle(sibling.text)) {
        break;
      }

      const next = sibling.nextElementSibling;
      sibling.remove();
      sibling = next instanceof HTMLElement ? next : null;
    }
  }
}

function removeActionableWidgets(container: HTMLElement) {
  container
    .querySelectorAll(
      ".sugerencias-accionables-ia, .sugerencia-accionable, [data-sugerencia-accionable], [data-actionable-suggestion]",
    )
    .forEach((node) => node.remove());

  container.querySelectorAll("button, a").forEach((node) => {
    const text = normalizeText(node.text);
    if (text === "aprobar" || text === "descartar") {
      const block = findSuggestionCardContainer(node);
      block?.remove();
    }
  });
}

function findSuggestionCardContainer(node: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = node;

  while (current) {
    if (
      current.classList.contains("sugerencia-accionable") ||
      current.classList.contains("sugerencias-accionables-ia") ||
      current.getAttribute("data-sugerencia-accionable") === "true"
    ) {
      return current;
    }

    current = current.parentNode instanceof HTMLElement ? current.parentNode : null;
  }

  return null;
}

function isActionableSectionTitle(value: string): boolean {
  const normalized = normalizeText(value);
  return ACTIONABLE_SECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isKnownNextSectionTitle(value: string): boolean {
  const normalized = normalizeText(value);
  return NEXT_SECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
