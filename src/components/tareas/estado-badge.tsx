import { Code, FileText } from "lucide-react";
import type { ComponentProps } from "react";

import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";

type EstadoRevision = "completo" | "pendiente" | "no_aplica";

type EstadoBadgeProps = {
  estado: EstadoRevision;
  etiqueta: string;
  evidence?: "documental" | "codigo";
};

export function EstadoBadge({ estado, etiqueta, evidence }: EstadoBadgeProps) {
  const icon =
    evidence === "documental" ? (
      <FileText className="size-3 shrink-0 opacity-90" aria-hidden />
    ) : evidence === "codigo" ? (
      <Code className="size-3 shrink-0 opacity-90" aria-hidden />
    ) : null;

  const chip = (variant: ComponentProps<typeof Badge>["variant"], className?: string) => (
    <Badge variant={variant} className={cn("gap-1", icon && "pl-2", className)}>
      {icon}
      {etiqueta}
    </Badge>
  );

  if (estado === "no_aplica") {
    return chip("default", "border border-zinc-200/80 bg-zinc-50 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300");
  }
  if (estado === "pendiente") {
    return chip("warning");
  }
  if (evidence === "codigo") {
    return chip("info");
  }
  return chip("success");
}
