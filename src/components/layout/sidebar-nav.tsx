import Link from "next/link";

import { cn } from "@/src/lib/utils";

type SidebarNavProps = {
  currentPath?: string;
  className?: string;
  onNavigate?: () => void;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tareas", label: "Tareas" },
  { href: "/chat", label: "Chat" },
];

export function SidebarNav({ currentPath, className, onNavigate }: SidebarNavProps) {
  return (
    <nav className={cn("flex flex-col gap-2", className)}>
      {navItems.map((item) => {
        const isActive = currentPath?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
