import { cn } from "@/src/lib/utils";
import { formatPercent, getProgressBarValue } from "@/src/features/budget/utils/budget-formatters";

export function BudgetProgressBar({ value }: { value: number | null | undefined }) {
  const percent = Number.isFinite(value) ? Number(value) : 0;
  const width = getProgressBarValue(percent);
  const hasOverrun = percent > 100;

  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Ejecucion presupuestaria real</p>
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            hasOverrun ? "text-rose-600 dark:text-rose-300" : "text-zinc-700 dark:text-zinc-200",
          )}
        >
          {formatPercent(percent)}% ejecutado
        </p>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            hasOverrun
              ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
              : "bg-gradient-to-r from-sky-500 to-emerald-500",
          )}
          style={{ width: `${width}%` }}
        />
        {hasOverrun ? (
          <div className="absolute inset-y-0 right-0 w-8 bg-rose-500/80 shadow-[0_0_16px_rgba(244,63,94,0.7)]" />
        ) : null}
      </div>
      {hasOverrun ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-300">
          Ejecucion superior al 100%; el reporte registra sobrecosto.
        </p>
      ) : null}
    </div>
  );
}

