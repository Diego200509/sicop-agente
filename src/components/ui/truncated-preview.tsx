"use client";

import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";
import { LinkPill } from "@/src/components/ui/link-pill";
import { cn } from "@/src/lib/utils";

const LINE_CLAMP: Record<3 | 4 | 5 | 6, string> = {
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
};

type TruncatedPreviewProps = {
  text: string;
  /** Ruta interna, ej. /tareas/TAREA-001 */
  moreHref: string;
  lines?: 3 | 4 | 5 | 6;
  moreLabel?: string;
  /** Estilo del enlace “Ver más” (usa `LinkPill`). Por defecto acento suave para destacar en tarjetas. */
  moreLinkVariant?: "default" | "emphasized";
  className?: string;
  format?: "plain" | "markdown";
};

export function TruncatedPreview({
  text,
  moreHref,
  lines = 4,
  moreLabel = "Ver más",
  moreLinkVariant = "emphasized",
  className,
  format = "plain",
}: TruncatedPreviewProps) {
  const trimmed = text.trim();
  const displayPlain = trimmed || "—";

  return (
    <div className={cn("space-y-2", className)}>
      {format === "markdown" ? (
        trimmed ? (
          <div className={cn("overflow-hidden", LINE_CLAMP[lines])}>
            <AnalysisMarkdown source={trimmed} compact />
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">—</p>
        )
      ) : (
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300",
            LINE_CLAMP[lines],
          )}
        >
          {displayPlain}
        </p>
      )}
      <div className="pt-0.5">
        <LinkPill href={moreHref} size="md" variant={moreLinkVariant}>
          {moreLabel}
        </LinkPill>
      </div>
    </div>
  );
}
