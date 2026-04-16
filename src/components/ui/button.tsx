import * as React from "react";

import { cn } from "@/src/lib/utils";

type ButtonVariant = "default" | "ghost";

const baseStyles =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
  ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return <button className={cn(baseStyles, variantStyles[variant], className)} {...props} />;
}
