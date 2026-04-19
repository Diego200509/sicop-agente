import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/src/lib/utils";

type EmptyStateTone = "default" | "error";

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
  tone?: EmptyStateTone;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  compact = false,
  tone = "default",
  className,
}: EmptyStateProps) {
  const isError = tone === "error";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 px-2 py-6" : "gap-3 px-4 py-12 sm:py-14",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "rounded-full",
          compact ? "p-2" : "p-3.5",
          isError
            ? "bg-rose-100 dark:bg-rose-950/50"
            : "bg-zinc-100 dark:bg-zinc-800/80",
        )}
      >
        <Icon
          className={cn(
            compact ? "size-5" : "size-8",
            isError ? "text-rose-500 dark:text-rose-400" : "text-zinc-400 dark:text-zinc-500",
          )}
          aria-hidden
        />
      </div>
      <div className={cn("space-y-1", compact ? "max-w-[14rem]" : "max-w-md")}>
        <p
          className={cn(
            "font-semibold",
            compact ? "text-xs" : "text-sm sm:text-base",
            isError ? "text-rose-800 dark:text-rose-200" : "text-zinc-900 dark:text-zinc-100",
          )}
        >
          {title}
        </p>
        {description != null && description !== "" ? (
          <div
            className={cn(
              "text-pretty",
              compact ? "text-[11px] leading-snug" : "text-sm leading-relaxed",
              isError ? "text-rose-700/90 dark:text-rose-300/90" : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className={cn("shrink-0", compact ? "mt-1" : "mt-2")}>{action}</div> : null}
    </div>
  );
}
