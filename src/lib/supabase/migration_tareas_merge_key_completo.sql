-- Ejecutar UNA vez en Supabase SQL Editor (script único).
-- Alineado con buildMergeKeyPreferTech (JS): ID: DS1 / Usar "DS1" en descripción → merge_key = ds1|||fase;
-- si no, merge_key = título normalizado|||fase.
-- Incluye: columna, recálculo, fusión de revisiones, borrado de tareas duplicadas, índice único.

-- 1) Columna
alter table public.tareas add column if not exists merge_key text;

-- 2) Extensión (normalización similar a la app)
create extension if not exists unaccent;

-- 3) Quitar índice único si existe (si no, el paso 4 puede fallar al asignar la misma clave a dos filas)
drop index if exists public.tareas_merge_key_unique;

-- 4) Recalcular merge_key en TODAS las filas (corrige nulls y claves viejas solo por título)
-- Nota: en UPDATE, LATERAL no puede usar la tabla destino `t`; el id técnico se calcula en un FROM derivado.
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
where t.id = tech.id;

-- 5) Unificar revisiones hacia la tarea “keeper” por merge_key (la más reciente por updated_at/created_at)
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

-- 6) Eliminar filas duplicadas de tareas (dejan de apuntar revisiones al perdedor)
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

-- 7) Índice único (evita nuevas duplicadas cuando merge_key no es null)
create unique index if not exists tareas_merge_key_unique
  on public.tareas (merge_key)
  where merge_key is not null;
