-- 1) Agregar columna de orden si no existe
alter table public.tareas
  add column if not exists orden integer null;

-- 2) Documentar la columna
comment on column public.tareas.orden is
  'Orden manual dentro de la misma fase (tablero). Valores más bajos primero; null = sin posición fija (se ordena por created_at en la app).';

-- 3) Crear índice para mejorar consultas del tablero
create index if not exists idx_tareas_fase_orden_created
  on public.tareas (fase, orden nulls last, created_at asc);

-- 4) Inicializar el orden para tareas existentes, por fase
with ordenadas as (
  select
    id,
    row_number() over (
      partition by fase
      order by created_at asc
    ) as nuevo_orden
  from public.tareas
)
update public.tareas
set orden = ordenadas.nuevo_orden
from ordenadas
where public.tareas.id = ordenadas.id
  and public.tareas.orden is null;