import type { LucideIcon } from "lucide-react";

import { cn } from "@/src/lib/utils";

type MetricCardTone = "emerald" | "blue" | "rose" | "sky" | "zinc" | "amber";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: MetricCardTone;
};

export function MetricCard({ label, value, icon: Icon, tone = "zinc" }: MetricCardProps) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug text-zinc-500 dark:text-zinc-400">{label}</p>
          <p
            className="mt-1 break-words text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50"
            title={String(value)}
          >
            {value}
          </p>
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", toneClass(tone))}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function toneClass(tone: MetricCardTone) {
  return {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
  }[tone];
}

