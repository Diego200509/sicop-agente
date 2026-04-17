import { Badge } from "@/src/components/ui/badge";
import { normalizePhase } from "@/src/lib/fases";

type FaseBadgeProps = {
  fase: string;
};

function faseStyles(fase: string): string {
  switch (normalizePhase(fase)) {
    case "planificacion":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    case "analisis de requerimientos":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    case "diseno":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300";
    case "desarrollo":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "seguimiento y control":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "cierre":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-200";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

export function FaseBadge({ fase }: FaseBadgeProps) {
  return <Badge className={faseStyles(fase)}>{fase}</Badge>;
}
