"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type ChatAssistantPlaceholderProps = {
  label?: string;
  className?: string;
};

export function ChatAssistantPlaceholder({
  label = "Analizando…",
  className,
}: ChatAssistantPlaceholderProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Loader2 className="size-4 shrink-0 animate-spin text-zinc-500 dark:text-zinc-400" aria-hidden />
      <span className="text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
      <span className="flex items-center gap-0.5 pl-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1 rounded-full bg-zinc-400 dark:bg-zinc-500"
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
            transition={{
              duration: 0.9,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
    </div>
  );
}
