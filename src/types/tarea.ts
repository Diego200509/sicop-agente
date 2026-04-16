export interface Tarea {
  id: string;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta?: string | null;
  created_at: string;
}
