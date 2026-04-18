import type { ReactNode } from "react";

import { cn } from "@/src/lib/utils";

const maxWidthClass = {
  /** Sin tope: tableros, tablas anchas; escala con el zoom del navegador. */
  none: "max-w-none",
  /** Texto en columna estrecha (landing, formularios simples). */
  readable: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  "6xl": "max-w-6xl",
} as const;

export type AppPageShellMaxWidth = keyof typeof maxWidthClass;

type AppPageShellProps = {
  children: ReactNode;
  title?: string;
  description?: ReactNode;
  /** Ancho máximo del bloque principal (por defecto sin tope, como Tareas). */
  maxWidth?: AppPageShellMaxWidth;
  /**
   * Ocupa el alto disponible del `main` (flex-1 + min-h-0).
   * Útil para chat o layouts con panel que debe crecer.
   */
  fillHeight?: boolean;
  className?: string;
  headerClassName?: string;
};

/**
 * Contenedor estándar de páginas dentro del shell: ancho fluido (`min-w-0`, `w-full`),
 * opcional `max-w-*` y mismo enfoque que Tareas respecto al zoom del navegador.
 */
export function AppPageShell({
  children,
  title,
  description,
  maxWidth = "none",
  fillHeight = false,
  className,
  headerClassName,
}: AppPageShellProps) {
  const showHeader = title != null || description != null;

  return (
    <section
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-4",
        maxWidthClass[maxWidth],
        fillHeight && "min-h-0 flex-1 overflow-hidden",
        className,
      )}
    >
      {showHeader ? (
        <div className={cn("shrink-0 space-y-1", headerClassName)}>
          {title ? <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2> : null}
          {description != null ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{description}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
