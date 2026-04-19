"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useState } from "react";

import { SidebarNav } from "@/src/components/layout/sidebar-nav";
import { MotionButton } from "@/src/components/ui/motion-press";
import { cn } from "@/src/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "sicop-sidebar-collapsed";

type AppShellProps = {
  children: React.ReactNode;
  currentPath?: string;
};

const SIDEBAR_W_EXPANDED = 256;
const SIDEBAR_W_COLLAPSED = 72;

const SIDEBAR_COLLAPSED_LOGO = "/sidebar-brand-collapsed.png";

export function AppShell({ children, currentPath }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const reduceMotion = useReducedMotion();

  const sidebarTransition =
    reduceMotion === true
      ? { duration: 0.05 }
      : { type: "spring" as const, stiffness: 380, damping: 38, mass: 0.72 };

  const brandTransition = reduceMotion === true ? { duration: 0.05 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  useLayoutEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <motion.aside
        aria-label="Navegacion principal"
        initial={false}
        animate={{
          width: sidebarCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED,
          paddingLeft: sidebarCollapsed ? 8 : 16,
          paddingRight: sidebarCollapsed ? 8 : 16,
          paddingTop: 16,
          paddingBottom: 16,
        }}
        transition={sidebarTransition}
        className={cn(
          "hidden h-dvh shrink-0 overflow-y-auto overflow-x-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col",
        )}
      >
        <Brand collapsed={sidebarCollapsed} transition={brandTransition} />
        <SidebarNav
          id="desktop-sidebar-nav"
          currentPath={currentPath}
          collapsed={sidebarCollapsed}
          className="mt-6 flex-1"
        />
        <div className={cn("mt-4 shrink-0", sidebarCollapsed ? "flex justify-center" : "")}>
          <motion.button
            type="button"
            tabIndex={0}
            layout
            onClick={toggleSidebar}
            aria-expanded={!sidebarCollapsed}
            aria-controls="desktop-sidebar-nav"
            title={sidebarCollapsed ? "Expandir menu" : "Contraer menu"}
            whileTap={{ scale: reduceMotion ? 1 : 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className={cn(
              "inline-flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800",
              sidebarCollapsed ? "size-10" : "h-10 min-w-0 w-full gap-2 px-3",
            )}
          >
            <motion.span
              animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
              transition={reduceMotion === true ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
              className="inline-flex shrink-0"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </motion.span>
            <motion.span
              animate={{
                opacity: sidebarCollapsed ? 0 : 1,
                maxWidth: sidebarCollapsed ? 0 : 120,
              }}
              transition={
                reduceMotion === true
                  ? { duration: 0 }
                  : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
              }
              className="overflow-hidden whitespace-nowrap text-xs font-medium"
              aria-hidden={sidebarCollapsed}
            >
              Contraer
            </motion.span>
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile header */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
          <MotionButton
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Abrir menu"
          >
            <MenuIcon className="size-5" />
          </MotionButton>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">SICOP Agente</p>
            <p className="truncate text-xs text-zinc-500">Revisiones</p>
          </div>
        </header>

        {/* Mobile overlay */}
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <aside
          id="mobile-nav"
          aria-hidden={!mobileOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r border-zinc-200 bg-white p-4 shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          )}
        >
          <div className="mb-6 flex items-center justify-between gap-2">
            <Brand transition={brandTransition} />
            <MotionButton
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Cerrar menu"
            >
              <CloseIcon className="size-5" />
            </MotionButton>
          </div>
          <SidebarNav currentPath={currentPath} onNavigate={() => setMobileOpen(false)} />
        </aside>

        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 lg:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand({ collapsed, transition }: { collapsed?: boolean; transition: Transition }) {
  return (
    <div className="relative min-h-[3.25rem]">
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.div
            key="brand-compact"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={transition}
            className="flex justify-center"
          >
            <div
              className="relative flex size-10 shrink-0 select-none items-center justify-center overflow-hidden rounded-lg bg-zinc-100 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-600"
              title="SICOP Agente"
            >
              <Image
                src={SIDEBAR_COLLAPSED_LOGO}
                alt=""
                width={40}
                height={40}
                className="object-contain p-1"
                priority
              />
            </div>
            <span className="sr-only">SICOP Agente, Revisiones</span>
          </motion.div>
        ) : (
          <motion.div
            key="brand-full"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={transition}
          >
            <h1 className="text-lg font-semibold">SICOP Agente</h1>
            <p className="text-sm text-zinc-500">Revisiones</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
