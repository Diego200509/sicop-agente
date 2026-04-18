import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { Card } from "@/src/components/ui/card";
import { MotionLink } from "@/src/components/ui/motion-press";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";

export type TareaTablaItem = {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  estado_documental: "completo" | "pendiente";
  estado_codigo: "completo" | "pendiente" | "no_aplica";
  fecha_ultima_revision: string | null;
};

type TareasTableProps = {
  tareas: TareaTablaItem[];
};

export function TareasTable({ tareas }: TareasTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="scrollbar-elegant w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Documental</TableHead>
            <TableHead>Codigo</TableHead>
            <TableHead>Ultima revision</TableHead>
            <TableHead className="text-right">Accion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tareas.map((tarea) => (
            <TableRow key={tarea.id}>
              <TableCell className="font-medium">{tarea.titulo}</TableCell>
              <TableCell>
                <FaseBadge fase={tarea.fase} />
              </TableCell>
              <TableCell>
                <EstadoBadge
                  estado={tarea.estado_documental}
                  etiqueta={tarea.estado_documental === "completo" ? "Completo" : "Pendiente"}
                />
              </TableCell>
              <TableCell>
                <EstadoBadge
                  estado={tarea.estado_codigo}
                  etiqueta={
                    tarea.estado_codigo === "completo"
                      ? "Completo"
                      : tarea.estado_codigo === "no_aplica"
                        ? "No aplica"
                        : "Pendiente"
                  }
                />
              </TableCell>
              <TableCell>
                {tarea.fecha_ultima_revision
                  ? new Date(tarea.fecha_ultima_revision).toLocaleString("es-ES")
                  : "Sin revisiones"}
              </TableCell>
              <TableCell className="text-right">
                <MotionLink
                  href={`/tareas/${tarea.id}`}
                  className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  Ver detalle
                </MotionLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </Card>
  );
}
