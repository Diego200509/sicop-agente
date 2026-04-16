"use client";

import { useEffect, useState } from "react";

import { SidebarNav } from "@/src/components/layout/sidebar-nav";
import { cn } from "@/src/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  currentPath?: string;
};

export function AppShell({ children, currentPath }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside aria-label="Navegacion principal" className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col">
        <Brand />
        <SidebarNav currentPath={currentPath} className="mt-6" />
      </aside>

      {/* Mobile header */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Abrir menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mini Sistema</p>
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
            <Brand />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Cerrar menu"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <SidebarNav currentPath={currentPath} onNavigate={() => setMobileOpen(false)} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div>
      <h1 className="text-lg font-semibold">Mini Sistema</h1>
      <p className="text-sm text-zinc-500">Revisiones</p>
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
