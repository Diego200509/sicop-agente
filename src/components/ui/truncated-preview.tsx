"use client";

import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";
import { MotionLink } from "@/src/components/ui/motion-press";
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
  className?: string;
  /**
   * `markdown`: analisis documental (react-markdown + GFM).
   * `plain`: texto sin interpretar (revision de codigo, etc.).
   */
  format?: "plain" | "markdown";
};

/**
 * Vista previa con truncado (line-clamp) y enlace "Ver más".
 * Para analisis documental use `format="markdown"`.
 */
export function TruncatedPreview({
  text,
  moreHref,
  lines = 4,
  moreLabel = "Ver más",
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
      <MotionLink
        href={moreHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
      >
        {moreLabel}
        <span aria-hidden className="text-xs">
          →
        </span>
      </MotionLink>
    </div>
  );
}
