"use client";

import { AppPageShell } from "@/src/components/layout/app-page-shell";
import { TareasBoard } from "@/src/components/tareas/tareas-board";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useTareas } from "@/src/hooks/use-tareas";

export default function TareasPage() {
  const { tareas, loading, error, search, setSearch } = useTareas();

  return (
    <AppPageShell title="Tareas" description="Vista tablero por fases.">
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
    </AppPageShell>
  );
}
