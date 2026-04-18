-- Ejecutar en Supabase SQL Editor (una vez) si la tabla ya existía sin merge_key.
-- Evita duplicados por carrera entre webhooks documental/código con distintos id_tarea.

alter table public.tareas add column if not exists merge_key text;

-- Rellenar merge_key en filas existentes (aprox. al normalize JS: minúsculas, sin puntuación extra).
-- Requiere extensión unaccent (habitual en Supabase).
create extension if not exists unaccent;

update public.tareas t
set merge_key =
  case
    when coalesce(tech.tech_id, '') <> '' then
      trim(
        regexp_replace(
          regexp_replace(lower(unaccent(trim(tech.tech_id))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
      || '|||'
      || trim(
        regexp_replace(
          regexp_replace(lower(unaccent(trim(t.fase))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
    else
      trim(
        regexp_replace(
          regexp_replace(lower(unaccent(trim(t.titulo))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
      || '|||'
      || trim(
        regexp_replace(
          regexp_replace(lower(unaccent(trim(t.fase))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
  end
from (
  select
    id,
    coalesce(
      nullif(trim((regexp_match(descripcion, 'ID:\s*([A-Za-z0-9_-]+)', 'i'))[1]), ''),
      nullif(
        trim((regexp_match(descripcion, 'Usar\s+["'']([A-Za-z0-9_-]+)["'']', 'i'))[1]),
        ''
      )
    ) as tech_id
  from public.tareas
) as tech
where t.merge_key is null
  and t.id = tech.id;

-- Unificar revisiones hacia la tarea más reciente por merge_key y borrar duplicados de tarea.
with ranked as (
  select
    id,
    merge_key,
    row_number() over (partition by merge_key order by updated_at desc nulls last, created_at desc) as rn
  from public.tareas
  where merge_key is not null
),
keepers as (
  select id as keeper_id, merge_key from ranked where rn = 1
),
losers as (
  select id as loser_id, merge_key from ranked where rn > 1
)
update public.revisiones r
set tarea_id = k.keeper_id
from keepers k
inner join losers l on l.merge_key = k.merge_key
where r.tarea_id = l.loser_id;

with ranked as (
  select
    id,
    merge_key,
    row_number() over (partition by merge_key order by updated_at desc nulls last, created_at desc) as rn
  from public.tareas
  where merge_key is not null
)
delete from public.tareas t
where t.id in (select id from ranked where rn > 1);

create unique index if not exists tareas_merge_key_unique
  on public.tareas(merge_key)
  where merge_key is not null;
