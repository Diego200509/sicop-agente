import { Badge } from "@/src/components/ui/badge";

type EstadoRevision = "completo" | "pendiente";

type EstadoBadgeProps = {
  estado: EstadoRevision;
  etiqueta: string;
};

export function EstadoBadge({ estado, etiqueta }: EstadoBadgeProps) {
  return <Badge variant={estado === "completo" ? "success" : "warning"}>{etiqueta}</Badge>;
}
