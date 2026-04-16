"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/src/components/layout/app-shell";

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  return (
    <AppShell key={pathname} currentPath={pathname}>
      {children}
    </AppShell>
  );
}
