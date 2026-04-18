"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/src/lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function usePressMotion() {
  const reduce = useReducedMotion();
  return {
    whileHover: reduce ? undefined : { y: -0.5 },
    whileTap: reduce ? undefined : { scale: 0.97 },
    transition: reduce ? { duration: 0 } : { duration: 0.18, ease: EASE_OUT },
  };
}

type MotionLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  className?: string;
  children: ReactNode;
  wrapperClassName?: string;
};

export function MotionLink({ className, children, wrapperClassName, ...props }: MotionLinkProps) {
  const press = usePressMotion();
  return (
    <motion.span {...press} tabIndex={-1} className={cn("inline-flex", wrapperClassName)}>
      <Link {...props} className={className}>
        {children}
      </Link>
    </motion.span>
  );
}

type MotionButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
> & {
  className?: string;
  children: ReactNode;
};

export function MotionButton({ className, children, ...props }: MotionButtonProps) {
  const press = usePressMotion();
  const { disabled, tabIndex, ...rest } = props;
  const resolvedTabIndex = tabIndex ?? (disabled ? -1 : 0);
  return (
    <motion.button
      {...press}
      tabIndex={resolvedTabIndex}
      disabled={disabled}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

