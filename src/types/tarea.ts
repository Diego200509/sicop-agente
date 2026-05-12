export interface Tarea {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta?: string | null;
  inicio?: string | null;
  fin?: string | null;
  completado?: boolean;
  estado?: string;
  created_at: string;
}
