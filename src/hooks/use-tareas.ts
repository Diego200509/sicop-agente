"use client";

import { useEffect, useMemo, useState } from "react";

import type { TareaTablaItem } from "@/src/components/tareas/tareas-table";

type UseTareasResult = {
  tareas: TareaTablaItem[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
};

export function useTareas(): UseTareasResult {
  const [tareas, setTareas] = useState<TareaTablaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());

        const response = await fetch(`/api/tareas?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) throw new Error("No se pudieron cargar las tareas");
        const json = (await response.json()) as { data: TareaTablaItem[] };
        setTareas(json.data ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [search]);

  return useMemo(
    () => ({
      tareas,
      loading,
      error,
      search,
      setSearch,
    }),
    [tareas, loading, error, search],
  );
}
