import { Card } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

type PdfTextViewerProps = {
  value: string | null | undefined;
  emptyLabel?: string;
  className?: string;
  preserveHardLineBreaks?: boolean;
};

const LABEL_LINE =
  /^\s*[A-Za-zÁÉÍÓÚÑáéíóú0-9][A-Za-zÁÉÍÓÚÑáéíóú0-9\s]{1,120}:\s*\S/;

function asciiFold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function splitAfterUltimaDate(line: string): { prefix: string; suffix: string } | null {
  const t = line.trim().replace(/\s+/g, " ");
  const re =
    /^((?:ÚLTIMA\s+REVISIÓN|ULTIMA\s+REVISION)\s*:\s*\d{1,2}\/\d{1,2}\/\d{2,4})\s*(.*)$/i;
  const m = t.match(re);
  if (!m) return null;
  return { prefix: m[1].trim(), suffix: m[2].trim() };
}

function isMetadataHeaderBlock(lines: string[]): boolean {
  if (lines.length < 3) return false;
  const j = asciiFold(lines.join("\n").toLowerCase());
  const hasCode = j.includes("codigo") || j.includes("core");
  const hasProceso = j.includes("proceso:");
  const hasVersion = j.includes("version:");
  const hasElab = j.includes("elaboracion:");
  const hasUltima = j.includes("ultima revision:");
  const hits = [hasCode, hasProceso, hasVersion, hasElab, hasUltima].filter(Boolean).length;
  return hits >= 4;
}

function fingerprintMetadataBlock(lines: string[]): string {
  return lines
    .map((l) => {
      const t = l.trim().replace(/\s+/g, " ");
      const split = splitAfterUltimaDate(t);
      if (split) return split.prefix;
      return t;
    })
    .join("|")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function tryMatchMetadataHeaderBlock(
  lines: string[],
  start: number,
): { startIdx: number; endIdx: number; lines: string[] } | null {
  let i = start;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return null;

  const startIdx = i;
  const collected: string[] = [];

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && LABEL_LINE.test(lines[j].trim())) {
        i++;
        continue;
      }
      break;
    }

    if (!LABEL_LINE.test(trimmed)) {
      if (collected.length === 0) return null;
      break;
    }

    collected.push(trimmed);
    i++;

    if (/ÚLTIMA REVISIÓN|ULTIMA REVISION/i.test(trimmed)) {
      if (!isMetadataHeaderBlock(collected)) return null;
      return { startIdx, endIdx: i, lines: collected };
    }
  }

  return null;
}

/** Quita repeticiones del mismo bloque de metadatos (misma huella); deja la primera aparición. Conserva texto pegado tras la fecha en ÚLTIMA REVISIÓN. */
function removeDuplicatePdfMetadataHeaders(text: string): string {
  let lines = text.split("\n");
  const blocks: { start: number; end: number; fp: string }[] = [];
  let scan = 0;
  while (scan < lines.length) {
    const m = tryMatchMetadataHeaderBlock(lines, scan);
    if (m) {
      blocks.push({ start: m.startIdx, end: m.endIdx, fp: fingerprintMetadataBlock(m.lines) });
      scan = m.endIdx;
    } else {
      scan++;
    }
  }

  const seen = new Set<string>();
  const toRemove: { start: number; end: number }[] = [];
  for (const b of blocks) {
    if (seen.has(b.fp)) {
      toRemove.push({ start: b.start, end: b.end });
    } else {
      seen.add(b.fp);
    }
  }

  toRemove.sort((a, b) => b.start - a.start);
  for (const r of toRemove) {
    const blockLines = lines.slice(r.start, r.end);
    const lastLine = blockLines[blockLines.length - 1]?.trim() ?? "";
    const normalizedLast = lastLine.replace(/\s+/g, " ");
    const split = splitAfterUltimaDate(normalizedLast);
    const suffix = split?.suffix.trim() ?? "";

    if (suffix) {
      lines = [...lines.slice(0, r.start), suffix, ...lines.slice(r.end)];
    } else {
      lines = [...lines.slice(0, r.start), ...lines.slice(r.end)];
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

const ROMAN_HEADING =
  /^(?:[IVXLCDM]{2,}|[IVXL])\.\s+[A-Za-zÁÉÍÓÚáéíóúÑñ¿?]/;

function insertBreaksBeforeArabicHeadings(text: string): string {
  return text.replace(
    /([^\n])(\s+)(?=(\d+(?:\.\d+)*\.?\s+[A-Za-zÁÉÍÓÚáéíóúÑñ¿?]))/g,
    (_full, before: string, space: string, lookahead: string) => {
      const num = lookahead.match(/^(\d+(?:\.\d+)*\.?)\s/)?.[1] ?? "";
      if (/^\d+\.\d+\.\d+/.test(num)) {
        return `${before}${space}`;
      }
      return `${before}\n`;
    },
  );
}

/** Separa encabezados con números romanos pegados al texto anterior (…proceso II. Situación…). */
function insertBreaksBeforeRomanHeadings(text: string): string {
  return text.replace(
    /([^\n])(\s+)(?=((?:[IVXLCDM]{2,}|[IVXL])\.\s+[A-Za-zÁÉÍÓÚáéíóúÑñ¿?]))/g,
    "$1\n",
  );
}

function isLikelySectionOrLabelLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (ROMAN_HEADING.test(t)) return true;
  if (/^\d+(?:\.\d+)*\.?\s+[A-Za-zÁÉÍÓÚáéíóúÑñ¿?]/.test(t)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóú\s\d]{1,48}:/.test(t)) return true;
  if (/^(?:Anexo|ANEXO|Capítulo|CAPÍTULO|Sección|SECCIÓN)\s+/i.test(t)) return true;
  return false;
}

function reflowPdfParagraphLines(parts: string[]): string {
  const cleaned = parts.map((p) => p.trimEnd()).filter((p) => p.trim());
  if (cleaned.length === 0) return "";
  let result = cleaned[0].trimEnd();
  for (let i = 1; i < cleaned.length; i++) {
    const next = cleaned[i].trimStart();
    if (/-\s*$/.test(result)) {
      result = result.replace(/-\s*$/, "") + next;
    } else {
      result = `${result} ${next}`;
    }
  }
  return result.replace(/\s+/g, " ").trim();
}

function pdfTextForDisplay(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n");
  const withHeadings = insertBreaksBeforeRomanHeadings(insertBreaksBeforeArabicHeadings(normalized));
  const lines = withHeadings.split("\n");

  const paragraphs: string[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    const merged = reflowPdfParagraphLines(buffer);
    if (merged) paragraphs.push(merged);
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBuffer();
      continue;
    }

    if (isLikelySectionOrLabelLine(trimmed) && buffer.length > 0) {
      flushBuffer();
    }

    buffer.push(line);
  }
  flushBuffer();

  return paragraphs.join("\n\n");
}

export function PdfTextViewer({
  value,
  emptyLabel = "Sin texto PDF registrado",
  className,
  preserveHardLineBreaks = false,
}: PdfTextViewerProps) {
  const raw = value?.trim() ?? "";

  if (!raw) {
    return (
      <Card className={cn("border-dashed p-4 text-sm text-zinc-500 dark:text-zinc-400", className)}>
        {emptyLabel}
      </Card>
    );
  }

  const normalized = raw.replace(/\r\n/g, "\n");
  const dedupedMetadata = removeDuplicatePdfMetadataHeaders(normalized);
  const displayText = preserveHardLineBreaks ? dedupedMetadata : pdfTextForDisplay(dedupedMetadata);

  return (
    <Card className={cn("w-full min-w-0 overflow-hidden border-zinc-200 p-0 dark:border-zinc-800", className)}>
      <div
        className={cn(
          "scrollbar-elegant w-full min-w-0 max-w-full max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3",
          "bg-zinc-50 dark:bg-zinc-950/80",
        )}
      >
        <pre
          className={cn(
            "box-border block w-full min-w-0 max-w-full",
            "whitespace-pre-wrap break-words font-sans text-sm leading-relaxed tracking-normal",
            "text-zinc-800 dark:text-zinc-200",
            "m-0",
          )}
        >
          {displayText}
        </pre>
      </div>
    </Card>
  );
}
