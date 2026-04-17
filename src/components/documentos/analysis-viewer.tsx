"use client";

import { Card } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";

type AnalysisViewerProps = {
  value: string | null | undefined;
  emptyLabel?: string;
  className?: string;
};

export function AnalysisViewer({
  value,
  emptyLabel = "Sin analisis documental registrado",
  className,
}: AnalysisViewerProps) {
  const raw = value?.trim() ?? "";

  if (!raw) {
    return (
      <Card className={cn("border-dashed p-4 text-sm text-zinc-500 dark:text-zinc-400", className)}>
        {emptyLabel}
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-zinc-200 p-0 dark:border-zinc-800", className)}>
      <div
        className={cn(
          "scrollbar-elegant max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain px-4 py-3",
          "bg-zinc-50 dark:bg-zinc-950/80",
        )}
      >
        <AnalysisMarkdown source={raw} />
      </div>
    </Card>
  );
}
