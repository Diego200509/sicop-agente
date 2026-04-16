import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";

type RevisionCardProps = {
  tipo: "documental" | "codigo";
  titulo: string;
  fecha: string | null;
  descripcion: string;
};

export function RevisionCard({ tipo, titulo, fecha, descripcion }: RevisionCardProps) {
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold">{titulo}</h4>
        <Badge variant={tipo === "documental" ? "secondary" : "default"}>{tipo}</Badge>
      </div>
      <p className="text-xs text-zinc-500">{fecha ? new Date(fecha).toLocaleString("es-ES") : "Sin fecha"}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{descripcion}</p>
    </Card>
  );
}
