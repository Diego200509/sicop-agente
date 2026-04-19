"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/src/lib/utils";

export type DetailBlockTone = "sky" | "violet" | "amber" | "emerald" | "rose" | "zinc";

const iconShell: Record<DetailBlockTone, string> = {
  sky: "bg-sky-500/14 text-sky-800 ring-sky-500/25 dark:bg-sky-400/12 dark:text-sky-100 dark:ring-sky-400/30",
  violet:
    "bg-violet-500/14 text-violet-900 ring-violet-500/25 dark:bg-violet-400/12 dark:text-violet-100 dark:ring-violet-400/30",
  amber:
    "bg-amber-500/14 text-amber-950 ring-amber-500/25 dark:bg-amber-400/12 dark:text-amber-100 dark:ring-amber-400/30",
  emerald:
    "bg-emerald-500/14 text-emerald-950 ring-emerald-500/25 dark:bg-emerald-400/12 dark:text-emerald-100 dark:ring-emerald-400/30",
  rose: "bg-rose-500/14 text-rose-950 ring-rose-500/25 dark:bg-rose-400/12 dark:text-rose-100 dark:ring-rose-400/30",
  zinc: "bg-zinc-200/90 text-zinc-800 ring-zinc-400/40 dark:bg-zinc-700/60 dark:text-zinc-100 dark:ring-zinc-500/40",
};

const shellPadding = {
  default: "px-3 py-2.5 sm:px-4 sm:py-3",
  dense: "px-3 py-2",
} as const;

function BlockHeader({
  icon: Icon,
  title,
  hint,
  tone,
  dense,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  tone: DetailBlockTone;
  dense: boolean;
}) {
  return (
    <div className={cn("flex gap-3", shellPadding[dense ? "dense" : "default"])}>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          iconShell[tone],
        )}
      >
        <Icon className={dense ? "size-4" : "size-[1.125rem]"} strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 className="text-sm font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
        {hint ? <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export type DetailBlockProps = {
  icon: LucideIcon;
  title: string;
  /** Texto auxiliar bajo el título; ayuda a separar visualmente del cuerpo. */
  hint?: string;
  tone?: DetailBlockTone;
  /** Menos padding en cabeceras compactas (p. ej. metadatos PR/repo). */
  dense?: boolean;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Bloque de detalle: cabecera con icono, jerarquía tipográfica y contenido asociado.
 */
export function DetailBlock({ icon: Icon, title, hint, tone = "zinc", dense = false, className, children }: DetailBlockProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-zinc-200/95 bg-gradient-to-br from-zinc-50/95 to-white shadow-sm dark:border-zinc-700/90 dark:from-zinc-900/80 dark:to-zinc-950/90",
        )}
      >
        <BlockHeader icon={Icon} title={title} hint={hint} tone={tone} dense={dense} />
      </div>
      {children ? <div className="min-w-0 pt-0.5">{children}</div> : null}
    </section>
  );
}

export type DetailBlockRowProps = Omit<DetailBlockProps, "children"> & {
  children: React.ReactNode;
};

/**
 * Misma cabecera que `DetailBlock`, pero el contenido (p. ej. badge) queda alineado a la derecha en pantallas anchas.
 */
export function DetailBlockRow({ icon: Icon, title, hint, tone = "zinc", dense = false, className, children }: DetailBlockRowProps) {
  return (
    <section className={cn(className)}>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-zinc-200/95 bg-gradient-to-br from-zinc-50/95 to-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-zinc-700/90 dark:from-zinc-900/80 dark:to-zinc-950/90 sm:px-4 sm:py-3",
          dense && "sm:py-2.5",
        )}
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
              iconShell[tone],
            )}
          >
            <Icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="text-sm font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
            {hint ? <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
          </div>
        </div>
        <div className="shrink-0 sm:pl-2">{children}</div>
      </div>
    </section>
  );
}
