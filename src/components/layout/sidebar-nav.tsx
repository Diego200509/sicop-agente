"use client";

import { ClipboardList, FileText, LayoutDashboard, MessageSquare } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionLink } from "@/src/components/ui/motion-press";
import { cn } from "@/src/lib/utils";

type SidebarNavProps = {
  id?: string;
  currentPath?: string;
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/tareas", label: "Tareas", Icon: ClipboardList },
  { href: "/reportes-seguimiento", label: "Reportes IA", Icon: FileText },
  { href: "/chat", label: "Chat", Icon: MessageSquare },
] as const;

export function SidebarNav({ id, currentPath, className, onNavigate, collapsed }: SidebarNavProps) {
  const reduceMotion = useReducedMotion();
  const labelTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <nav id={id} className={cn("flex flex-col gap-2", className)}>
      {navItems.map((item) => {
        const isActive = currentPath?.startsWith(item.href);
        const { Icon } = item;

        return (
          <MotionLink
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            onClick={onNavigate}
            className={cn(
              "flex w-full items-center rounded-md text-sm font-medium transition-[color,background-color] duration-200 ease-out",
              collapsed
                ? "mx-auto size-11 justify-center p-0"
                : "gap-3 px-3 py-2",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
          >
            <Icon
              className={cn(
                "shrink-0 transition-[width,height] duration-300 ease-in-out motion-reduce:transition-none",
                collapsed ? "size-5" : "size-[1.125rem]",
              )}
              aria-hidden
            />
            <motion.span
              animate={{
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? 0 : 160,
              }}
              transition={labelTransition}
              className="inline-block overflow-hidden whitespace-nowrap"
              style={{ pointerEvents: collapsed ? "none" : "auto" }}
              aria-hidden={collapsed}
            >
              {item.label}
            </motion.span>
          </MotionLink>
        );
      })}
    </nav>
  );
}
