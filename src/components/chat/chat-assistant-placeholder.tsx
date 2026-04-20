"use client";

import { useEffect, useMemo, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/src/lib/utils";

const DEFAULT_PHRASES = [
  "Analizando…",
  "Revisando documento…",
  "Comparando información…",
] as const;

type ChatAssistantPlaceholderProps = {
  /** Si se pasa, se muestra solo este texto (sin rotación). */
  label?: string;
  className?: string;
};

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 pl-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1 rounded-full bg-zinc-400/90 dark:bg-zinc-500"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1, 0.85] }}
          transition={{
            duration: 1.05,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function SkeletonLines() {
  const widths = ["w-[min(100%,18rem)]", "w-[76%]", "w-[52%]"] as const;
  return (
    <div className="space-y-2 pt-0.5" aria-hidden>
      {widths.map((w, i) => (
        <motion.div
          key={i}
          className={cn(
            "h-2 rounded-full bg-zinc-100 dark:bg-zinc-800/90",
            w,
            "max-w-full",
          )}
          initial={{ opacity: 0.45 }}
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{
            duration: 1.35,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function ChatAssistantPlaceholder({
  label,
  className,
}: ChatAssistantPlaceholderProps) {
  const phrases = useMemo(
    () => (label?.trim() ? [label.trim()] : [...DEFAULT_PHRASES]),
    [label],
  );
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [phrases]);

  const display = phrases[phraseIdx] ?? phrases[0];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("min-w-0 select-none", className)}
    >
      <div className="flex min-h-[1.25rem] items-center gap-2.5">
        <span
          className="size-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm ring-2 ring-violet-500/20 dark:from-violet-400 dark:to-indigo-500 dark:ring-violet-400/25"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={display}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="min-w-0 truncate text-[13px] font-medium leading-snug tracking-tight text-zinc-700 dark:text-zinc-200"
            >
              {display}
            </motion.span>
          </AnimatePresence>
          <TypingDots />
        </div>
      </div>
      <SkeletonLines />
    </div>
  );
}
