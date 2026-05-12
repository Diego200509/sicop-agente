"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/src/lib/utils";

export const MARKDOWN_PROSE_CLASSES =
  "text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100";

function getMarkdownComponents(compact: boolean) {
  const h1 = compact
    ? "mb-2 mt-0 border-b border-zinc-200 pb-1.5 text-base font-bold first:mt-0 dark:border-zinc-700"
    : "mb-3 mt-6 border-b border-zinc-200 pb-2 text-xl font-bold first:mt-0 dark:border-zinc-700";
  const h2 = compact
    ? "mb-1.5 mt-3 text-sm font-semibold first:mt-0"
    : "mb-2 mt-5 text-lg font-semibold first:mt-0";
  const h3 = compact
    ? "mb-1.5 mt-2.5 text-sm font-semibold first:mt-0"
    : "mb-2 mt-4 text-base font-semibold first:mt-0";
  const h4 = compact
    ? "mb-1.5 mt-2 text-xs font-semibold first:mt-0"
    : "mb-2 mt-3 text-sm font-semibold first:mt-0";
  const pMb = compact ? "mb-2" : "mb-3";
  const blockMb = compact ? "mb-2" : "mb-3";
  const preMb = compact ? "mb-2 p-2 text-xs" : "mb-3 p-3 text-sm";

  return {
    h1: ({ children }: { children?: ReactNode }) => <h1 className={h1}>{children}</h1>,
    h2: ({ children }: { children?: ReactNode }) => <h2 className={h2}>{children}</h2>,
    h3: ({ children }: { children?: ReactNode }) => <h3 className={h3}>{children}</h3>,
    h4: ({ children }: { children?: ReactNode }) => <h4 className={h4}>{children}</h4>,
    p: ({ children }: { children?: ReactNode }) => <p className={cn(pMb, "last:mb-0")}>{children}</p>,
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className={cn(blockMb, "list-disc space-y-1 pl-5 marker:text-zinc-500 dark:marker:text-zinc-400")}>{children}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className={cn(blockMb, "list-decimal space-y-1 pl-5 marker:text-zinc-500 dark:marker:text-zinc-400")}>{children}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => <li className="pl-0.5">{children}</li>,
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="mb-3 border-l-4 border-zinc-300 pl-3 text-sm italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: { href?: string; children?: ReactNode }) => (
      <a
        href={href}
        className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({
      className: codeClass,
      children,
      inline,
      ...rest
    }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
      if (inline === true) {
        return (
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[0.875em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            {children}
          </code>
        );
      }
      return (
        <code className={cn("font-mono text-zinc-100", compact ? "text-xs" : "text-sm", codeClass)} {...rest}>
          {children}
        </code>
      );
    },
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className={cn("scrollbar-elegant overflow-x-auto rounded-lg bg-zinc-900 text-zinc-100", preMb)}>{children}</pre>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className={cn(blockMb, "scrollbar-elegant overflow-x-auto")}>
        <table className="w-full min-w-[44rem] border-collapse border border-zinc-300 text-xs dark:border-zinc-600 sm:text-sm [&_td:first-child]:min-w-48 [&_td:first-child]:whitespace-normal [&_th:first-child]:min-w-48">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => <thead className="bg-zinc-100 dark:bg-zinc-900">{children}</thead>,
    th: ({ children }: { children?: ReactNode }) => (
      <th className="whitespace-nowrap border border-zinc-300 px-2.5 py-1.5 text-left font-semibold dark:border-zinc-600">{children}</th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="whitespace-nowrap border border-zinc-300 px-2.5 py-1.5 align-top dark:border-zinc-600">{children}</td>
    ),
    tr: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
    hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-700" />,
  };
}

type AnalysisMarkdownProps = {
  source: string;
  className?: string;
  /** Encabezados y márgenes más ajustados (vistas previas, tarjetas compactas) */
  compact?: boolean;
};

/**
 * Cuerpo Markdown compartido (react-markdown + remark-gfm).
 * No altera el string de origen; solo presentación.
 */
export function AnalysisMarkdown({ source, className, compact = false }: AnalysisMarkdownProps) {
  const raw = source.trim();
  if (!raw) {
    return null;
  }

  return (
    <div className={cn(MARKDOWN_PROSE_CLASSES, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={getMarkdownComponents(compact)}>
        {raw}
      </ReactMarkdown>
    </div>
  );
}
