import { Code2, FileText } from "lucide-react";

import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { FormattedDate } from "@/src/components/ui/formatted-date";
import { TruncatedPreview } from "@/src/components/ui/truncated-preview";
import { cn } from "@/src/lib/utils";

type RevisionCardProps = {
  tipo: "documental" | "codigo";
  titulo: string;
  fase?: string;
  fecha: string | null;
  descripcion: string;
  detalleHref?: string;
  previewLines?: 3 | 4 | 5 | 6;
};

export function RevisionCard({ tipo, titulo, fase, fecha, descripcion, detalleHref, previewLines = 4 }: RevisionCardProps) {
  const TipoIcon = tipo === "documental" ? FileText : Code2;
  return (
    <Card className="space-y-2 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold leading-snug">{titulo}</h4>
          {fase ? <FaseBadge fase={fase} /> : null}
        </div>
        <Badge
          variant={tipo === "documental" ? "secondary" : "default"}
          className={cn(
            "shrink-0 gap-1 capitalize",
            tipo === "codigo" &&
              "border border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
          )}
        >
          <TipoIcon className="size-3.5 opacity-90" aria-hidden />
          {tipo}
        </Badge>
      </div>
      <p className="text-xs text-zinc-500">
        <FormattedDate value={fecha} />
      </p>
      {detalleHref ? (
        <TruncatedPreview
          text={descripcion}
          moreHref={detalleHref}
          lines={previewLines}
          format="markdown"
        />
      ) : descripcion.trim() ? (
        <AnalysisMarkdown source={descripcion} compact className="text-sm" />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">—</p>
      )}
    </Card>
  );
}
