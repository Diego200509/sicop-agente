"use client";

import { CircleAlert, ClipboardList } from "lucide-react";

import { AppPageShell } from "@/src/components/layout/app-page-shell";
import { TareasBoard } from "@/src/components/tareas/tareas-board";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { useTareas } from "@/src/hooks/use-tareas";

export default function TareasPage() {
  const { tareas, setTareas, loading, error, search, setSearch } = useTareas();

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
        <Card className="shrink-0 overflow-hidden">
          <EmptyState tone="error" icon={CircleAlert} title="Error al cargar tareas" description={error} />
        </Card>
      )}

      {!loading && !error && tareas.length === 0 && (
        <Card className="shrink-0 overflow-hidden">
          <EmptyState
            icon={ClipboardList}
            title="No hay tareas para mostrar"
            description={
              search.trim()
                ? "No hay coincidencias con tu búsqueda. Prueba otras palabras o borra el texto del buscador."
                : "Aún no hay tareas registradas. Cuando existan en el sistema, aparecerán aquí en el tablero."
            }
          />
        </Card>
      )}

      {!loading && !error && tareas.length > 0 && (
        <TareasBoard tareas={tareas} onTareasChange={setTareas} />
      )}
    </AppPageShell>
  );
}
