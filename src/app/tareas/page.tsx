"use client";

import { TareasBoard } from "@/src/components/tareas/tareas-board";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useTareas } from "@/src/hooks/use-tareas";

export default function TareasPage() {
  const { tareas, loading, error, search, setSearch } = useTareas();

  return (
    <section className="mx-auto flex w-full max-w-none flex-col gap-4">
      <div className="shrink-0 space-y-1">
        <h2 className="text-2xl font-semibold sm:text-3xl">Tareas</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Vista tablero por fases.</p>
      </div>

      <Card className="shrink-0">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar tareas por titulo..."
        />
      </Card>

      {loading && (
        <Card className="shrink-0">
          <p className="text-sm text-zinc-500">Cargando tareas...</p>
        </Card>
      )}

      {error && (
        <Card className="shrink-0">
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      )}

      {!loading && !error && tareas.length === 0 && (
        <Card className="shrink-0">
          <p className="text-sm text-zinc-500">No hay tareas que coincidan con la busqueda.</p>
        </Card>
      )}

      {!loading && !error && tareas.length > 0 && <TareasBoard tareas={tareas} />}
    </section>
  );
}
