"use client";

import { useRouter } from "next/navigation";

import { MotionButton, MotionLink } from "@/src/components/ui/motion-press";
import { cn } from "@/src/lib/utils";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
  variant?: "default" | "ghost";
  /**
   * Si es true, intenta `router.back()`; si no hay historial, navega a `href`.
   */
  preferBrowserBack?: boolean;
};

export function BackButton({
  href,
  label = "Volver",
  className,
  variant = "default",
  preferBrowserBack = false,
}: BackButtonProps) {
  if (preferBrowserBack) {
    return <BackButtonHistory href={href} label={label} className={className} variant={variant} />;
  }

  return (
    <MotionLink href={href} className={buttonClasses(variant, className)} aria-label={label}>
      <ArrowLeftIcon className="size-4 shrink-0" />
      <span>{label}</span>
    </MotionLink>
  );
}

function BackButtonHistory({
  href,
  label = "Volver",
  className,
  variant,
}: Pick<BackButtonProps, "href" | "label" | "className" | "variant">) {
  const router = useRouter();

  return (
    <MotionButton
      type="button"
      onClick={() => {
        try {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
          }
        } catch {
          /* noop */
        }
        router.push(href);
      }}
      className={buttonClasses(variant ?? "default", className)}
      aria-label={label}
    >
      <ArrowLeftIcon className="size-4 shrink-0" />
      <span>{label}</span>
    </MotionButton>
  );
}

function buttonClasses(variant: "default" | "ghost", className?: string) {
  return cn(
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950",
    variant === "default" &&
      "border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
    variant === "ghost" && "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
    className,
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}
