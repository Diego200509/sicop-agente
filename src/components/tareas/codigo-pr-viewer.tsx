"use client";

import { cn } from "@/src/lib/utils";

/** Líneas solo con `=` (p. ej. entre archivos en dumps de n8n). */
const SEP_EQUALS = /\n={8,}\n/g;

function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Parte el texto en bloques (varios archivos / fragmentos).
 * Orden: separador `====`, luego cortes en cada `diff --git` si aplica.
 */
export function splitCodigoPrSections(raw: string): string[] {
  const text = normalizeNewlines(raw).trim();
  if (!text) return [];

  const byEquals = text.split(SEP_EQUALS).map((s) => s.trim()).filter(Boolean);
  if (byEquals.length > 1) {
    return byEquals.flatMap((chunk) => splitByDiffGit(chunk));
  }

  return splitByDiffGit(text);
}

function splitByDiffGit(chunk: string): string[] {
  const parts = chunk.split(/\n(?=diff --git )/);
  if (parts.length > 1) {
    return parts.map((p) => p.trim()).filter(Boolean);
  }
  return [chunk.trim()].filter(Boolean);
}

/** Título legible para la cabecera de cada bloque. */
export function codigoPrSectionTitle(block: string): string {
  const lines = block.split("\n");
  const first = lines[0]?.trim() ?? "";

  const git = block.match(/^diff --git a\/(?:.*?) b\/(.+?)(?:\s|$)/m);
  if (git?.[1]) {
    return git[1].trim();
  }

  if (
    first &&
    first.length < 220 &&
    (first.includes("/") || first.includes("\\")) &&
    !first.startsWith("diff ") &&
    !first.startsWith("@@")
  ) {
    return first;
  }

  if (first && first.length < 120 && !first.startsWith("@@")) {
    return first;
  }

  return "Fragmento";
}

type LineKind = "meta" | "hunk" | "add" | "remove" | "context";

function classifyDiffLine(line: string): LineKind {
  const t = line.trimEnd();

  if (
    t.startsWith("diff --git ") ||
    t.startsWith("new file mode") ||
    t.startsWith("deleted file mode") ||
    t.startsWith("similarity index ") ||
    t.startsWith("dissimilarity index ") ||
    t.startsWith("rename from ") ||
    t.startsWith("rename to ") ||
    t.startsWith("Binary files ") ||
    t.startsWith("index ")
  ) {
    return "meta";
  }
  if (t.startsWith("--- ") || t.startsWith("+++ ")) return "meta";
  if (t.startsWith("@@")) return "hunk";
  if (t.startsWith("\\")) return "meta";
  if (t.startsWith("+") && !t.startsWith("+++")) return "add";
  if (t.startsWith("-") && !t.startsWith("---")) return "remove";
  return "context";
}

function lineClass(kind: LineKind): string {
  switch (kind) {
    case "meta":
      return "border-l-2 border-transparent bg-zinc-800/40 pl-2 text-[11px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400";
    case "hunk":
      return "border-l-2 border-sky-500/60 bg-sky-950/35 pl-2 text-[11px] font-medium text-sky-200 dark:text-sky-300";
    case "add":
      return "border-l-2 border-emerald-500/70 bg-emerald-950/45 pl-2 text-emerald-100 dark:bg-emerald-950/50";
    case "remove":
      return "border-l-2 border-rose-500/70 bg-rose-950/45 pl-2 text-rose-100 dark:bg-rose-950/50";
    default:
      return "border-l-2 border-transparent bg-zinc-900/20 pl-2 text-zinc-300 dark:bg-zinc-950/40 dark:text-zinc-300";
  }
}

function looksLikeDiffLines(lines: string[]): boolean {
  if (lines.some((l) => /^@@/.test(l) || /^diff --git /.test(l))) return true;
  const plusMinus = lines.filter(
    (l) =>
      (l.startsWith("+") && !l.startsWith("+++")) || (l.startsWith("-") && !l.startsWith("---")),
  );
  return plusMinus.length >= 2;
}

function DiffLines({ text }: { text: string }) {
  const lines = normalizeNewlines(text).split("\n");
  const looksDiff = looksLikeDiffLines(lines);

  if (!looksDiff) {
    return (
      <pre
        className={cn(
          "scrollbar-elegant m-0 overflow-x-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed",
          "text-zinc-200",
        )}
      >
        {text}
      </pre>
    );
  }

  return (
    <div className="scrollbar-elegant max-h-[min(70vh,720px)] overflow-auto overscroll-contain p-1">
      <div className="min-w-0 font-mono text-[11px] leading-snug">
        {lines.map((line, i) => {
          const kind = classifyDiffLine(line);
          return (
            <div key={i} className={cn("whitespace-pre-wrap break-all py-px", lineClass(kind))}>
              <span className="inline-block min-h-[1em] w-full">{line || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CodigoPrViewerProps = {
  value: string | null | undefined;
  className?: string;
  emptyLabel?: string;
};

/**
 * Muestra el texto crudo del PR (diff / varios archivos) con secciones y coloreado tipo Git.
 * Compatible con separadores `============` y con varios `diff --git` seguidos.
 */
export function CodigoPrViewer({
  value,
  className,
  emptyLabel = "Sin codigo PR registrado",
}: CodigoPrViewerProps) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return (
      <p className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} aria-live="polite">
        {emptyLabel}
      </p>
    );
  }

  const sections = splitCodigoPrSections(raw);

  return (
    <div className={cn("space-y-3", className)} role="region" aria-label="Código del pull request">
      {sections.map((block, i) => (
        <article
          key={i}
          className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80"
        >
          <header className="border-b border-zinc-200 bg-zinc-100/90 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/90">
            <p className="truncate font-mono text-xs font-medium text-zinc-700 dark:text-zinc-200" title={codigoPrSectionTitle(block)}>
              {codigoPrSectionTitle(block)}
            </p>
          </header>
          <div className="bg-zinc-100 dark:bg-zinc-950">
            <DiffLines text={block} />
          </div>
        </article>
      ))}
    </div>
  );
}
