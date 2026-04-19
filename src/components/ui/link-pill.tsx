"use client";

import { ChevronRight } from "lucide-react";

import { MotionLink } from "@/src/components/ui/motion-press";
import { cn } from "@/src/lib/utils";

const sizeStyles = {
  sm: "gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
  md: "gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
} as const;

const chevronSizes = {
  sm: "size-3.5",
  md: "size-4",
} as const;

const variantStyles = {
  default: cn(
    "border border-zinc-200 bg-white text-zinc-800 shadow-sm",
    "transition-colors hover:border-zinc-300 hover:bg-zinc-50",
    "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700",
  ),
  emphasized: cn(
    "border border-sky-200/90 bg-sky-50/90 text-sky-950 shadow-sm",
    "transition-colors hover:border-sky-300 hover:bg-sky-100/90",
    "dark:border-sky-800 dark:bg-sky-950/45 dark:text-sky-50 dark:hover:border-sky-600 dark:hover:bg-sky-900/55",
  ),
} as const;

export type LinkPillProps = {
  href: string;
  children: React.ReactNode;
  /** `sm`: filas y controles compactos. `md`: tarjetas y previews. */
  size?: keyof typeof sizeStyles;
  /** `default`: neutro. `emphasized`: acento suave (p. ej. “Ver más”). */
  variant?: keyof typeof variantStyles;
  trailing?: "chevron" | "none";
  wrapperClassName?: string;
  className?: string;
};

/**
 * Enlace con aspecto de botón secundario (pastilla), reutilizable en tablas, tarjetas y previews.
 */
export function LinkPill({
  href,
  children,
  size = "md",
  variant = "default",
  trailing = "chevron",
  wrapperClassName,
  className,
}: LinkPillProps) {
  return (
    <MotionLink
      href={href}
      wrapperClassName={cn("inline-flex", wrapperClassName)}
      className={cn(
        "inline-flex items-center font-medium leading-none",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {trailing === "chevron" ? (
        <ChevronRight className={cn(chevronSizes[size], "shrink-0 opacity-80")} aria-hidden />
      ) : null}
    </MotionLink>
  );
}
