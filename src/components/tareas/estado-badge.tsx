import { Badge } from "@/src/components/ui/badge";

type EstadoRevision = "completo" | "pendiente" | "no_aplica";

type EstadoBadgeProps = {
  estado: EstadoRevision;
  etiqueta: string;
};

export function EstadoBadge({ estado, etiqueta }: EstadoBadgeProps) {
  if (estado === "no_aplica") {
    return <Badge variant="default">{etiqueta}</Badge>;
  }
  return <Badge variant={estado === "completo" ? "success" : "warning"}>{etiqueta}</Badge>;
}
