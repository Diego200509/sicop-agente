import { RevisionCard } from "@/src/components/revisiones/revision-card";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import { TareaRepository } from "@/src/repositories/tarea.repository";

async function getDashboardData() {
  try {
    const repository = new TareaRepository(getSupabaseClient());
    return await repository.getDashboardData();
  } catch {
    return {
      total_tareas: 0,
      total_revisiones_documentales: 0,
      total_revisiones_codigo: 0,
      ultimas_revisiones: [],
    };
  }
}

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <h2 className="text-2xl font-semibold sm:text-3xl">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1">
          <p className="text-sm text-zinc-500">Total tareas</p>
          <p className="text-3xl font-bold">{dashboard.total_tareas}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-zinc-500">Revisiones documentales</p>
          <p className="text-3xl font-bold">{dashboard.total_revisiones_documentales}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-zinc-500">Revisiones de codigo</p>
          <p className="text-3xl font-bold">{dashboard.total_revisiones_codigo}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Ultimas revisiones</h3>
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.ultimas_revisiones.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell>{revision.titulo_tarea}</TableCell>
                  <TableCell>
                    <Badge variant={revision.tipo_revision === "documental" ? "secondary" : "default"}>
                      {revision.tipo_revision}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {revision.fecha_revision ? new Date(revision.fecha_revision).toLocaleString("es-ES") : "Sin fecha"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {dashboard.ultimas_revisiones.slice(0, 4).map((revision) => (
          <RevisionCard
            key={`card-${revision.id}`}
            tipo={revision.tipo_revision}
            titulo={revision.titulo_tarea}
            fecha={revision.fecha_revision}
            descripcion={revision.descripcion || "Sin analisis registrado"}
          />
        ))}
      </div>
    </section>
  );
}
