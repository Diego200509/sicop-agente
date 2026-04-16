"use client";

import { TareasTable } from "@/src/components/tareas/tareas-table";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useTareas } from "@/src/hooks/use-tareas";

export default function TareasPage() {
  const { tareas, loading, error, search, setSearch } = useTareas();

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <h2 className="text-2xl font-semibold sm:text-3xl">Tareas</h2>

      <Card>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar tareas por titulo..."
        />
      </Card>

      {loading && (
        <Card>
          <p className="text-sm text-zinc-500">Cargando tareas...</p>
        </Card>
      )}

      {error && (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      )}

      {!loading && !error && <TareasTable tareas={tareas} />}
    </section>
  );
}
