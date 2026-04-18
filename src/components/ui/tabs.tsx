"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/src/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-start gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800 sm:h-10 sm:flex-nowrap sm:justify-center",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
> & {
  value: string;
};

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) return null;

  const isActive = context.value === value;
  const reduceMotion = useReducedMotion();
  const { disabled, tabIndex, children, ...rest } = props;
  const resolvedTabIndex = tabIndex ?? (disabled ? -1 : 0);

  return (
    <motion.button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium",
        "transition-[color] duration-200 ease-out",
        isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100",
        className,
      )}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      tabIndex={resolvedTabIndex}
      disabled={disabled}
      onClick={() => context.setValue(value)}
      {...rest}
    >
      {isActive ? (
        <motion.span
          layoutId="sicop-tabs-indicator"
          className="absolute inset-0 rounded bg-white shadow-sm dark:bg-zinc-900"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 42, mass: 0.7 }
          }
          aria-hidden
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context || context.value !== value) return null;

  return <div className={cn("mt-4", className)} {...props} />;
}
