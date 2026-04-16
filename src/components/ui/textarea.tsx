import * as React from "react";

import { cn } from "@/src/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-offset-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-offset-zinc-900",
        className,
      )}
      {...props}
    />
  );
}
