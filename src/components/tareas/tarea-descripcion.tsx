"use client";

import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";
import { cn } from "@/src/lib/utils";

export function prepareTareaDescripcionMarkdown(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
  if (!normalized.trim()) return "";

  const lines = normalized.split("\n");
  const withFieldBreaks: string[] = [];
  let prevWasBlank = true;

  for (const line of lines) {
    const trimmed = line.trim();
    const isBlank = trimmed === "";
    const isListLine = /^\s*([-*•]|\d+[\.)])\s/.test(line);
    const looksLikeLabeledLine =
      trimmed.length > 0 &&
      !/^https?:\/\//i.test(trimmed) &&
      /^[^:\n]{1,90}:\s/.test(trimmed);

    if (looksLikeLabeledLine && !isBlank && !prevWasBlank && !isListLine) {
      withFieldBreaks.push("");
    }
    withFieldBreaks.push(line);
    prevWasBlank = isBlank;
  }

  const chunks = withFieldBreaks.join("\n").split(/\n\n+/);

  return chunks
    .map((chunk) => {
      const chunkLines = chunk.split("\n");
      const nonEmpty = chunkLines.filter((l) => l.trim() !== "");
      const allListOrEmpty =
        nonEmpty.length > 0 &&
        nonEmpty.every((l) => /^\s*([-*•]|\d+[\.)])\s/.test(l));

      if (allListOrEmpty) {
        return ensureBlankLineBeforeList(chunkLines).join("\n").trim();
      }

      return ensureBlankLineBeforeList(chunkLines)
        .map((l) => l.trimEnd())
        .join("  \n");
    })
    .join("\n\n");
}

function ensureBlankLineBeforeList(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isList = /^\s*([-*•]|\d+[\.)])\s/.test(line);
    const prev = out[out.length - 1];
    const prevNonBlank = prev !== undefined && prev.trim() !== "";
    if (isList && prevNonBlank && !/^\s*([-*•]|\d+[\.)])\s/.test(prev!)) {
      out.push("");
    }
    out.push(line);
  }
  return out;
}

type TareaDescripcionProps = {
  text: string | null | undefined;
  className?: string;
};

export function TareaDescripcion({ text, className }: TareaDescripcionProps) {
  const raw = text?.trim() ?? "";
  if (!raw) {
    return (
      <p className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} aria-live="polite">
        Sin descripción registrada.
      </p>
    );
  }

  const md = prepareTareaDescripcionMarkdown(raw);

  return (
    <div
      role="region"
      aria-label="Descripción de la tarea"
      className={cn(
        "rounded-lg border border-zinc-200 bg-zinc-50/90 px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50",
        className,
      )}
    >
      <AnalysisMarkdown source={md} compact className="max-w-none" />
    </div>
  );
}
