import type { ReactNode } from "react";

import { cn } from "@/src/lib/utils";

type SectionCardProps = {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3> : null}
            {description ? <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</div> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

