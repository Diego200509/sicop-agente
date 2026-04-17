import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { FormattedDate } from "@/src/components/ui/formatted-date";
import { TruncatedPreview } from "@/src/components/ui/truncated-preview";

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
  const previewFormat = tipo === "documental" ? "markdown" : "plain";

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold leading-snug">{titulo}</h4>
          {fase ? <FaseBadge fase={fase} /> : null}
        </div>
        <Badge variant={tipo === "documental" ? "secondary" : "default"}>{tipo}</Badge>
      </div>
      <p className="text-xs text-zinc-500">
        <FormattedDate value={fecha} />
      </p>
      {detalleHref ? (
        <TruncatedPreview
          text={descripcion}
          moreHref={detalleHref}
          lines={previewLines}
          format={previewFormat}
        />
      ) : previewFormat === "markdown" ? (
        descripcion.trim() ? (
          <AnalysisMarkdown source={descripcion} compact className="text-sm" />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">—</p>
        )
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">{descripcion}</p>
      )}
    </Card>
  );
}
