import Link from "next/link";

import { EstadoBadge } from "@/src/components/tareas/estado-badge";
import { FaseBadge } from "@/src/components/tareas/fase-badge";
import { Card } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";

export type TareaTablaItem = {
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
            <TableRow key={tarea.id_tarea}>
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
                <Link href={`/tareas/${tarea.id_tarea}`} className="text-sm font-medium text-blue-600 hover:underline">
                  Ver detalle
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </Card>
  );
}
