-- =============================================================================
-- SICOP Agente — Unificación de tareas por merge_key (documental + código n8n)
-- Ejecutar entero en Supabase SQL Editor (PostgreSQL).
--
-- Qué resuelve:
--   - merge_key coherente con la app (ID: DS1 / Usar "DS1" + fase, o título + fase)
--   - trigger BEFORE INSERT/UPDATE si merge_key viene vacío
--   - RPC atómica upsert_tarea_by_merge_key (identidad lógica = merge_key, no id_tarea)
--   - backfill, fusión de duplicados, reapunte de revisiones, índice único parcial
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Extensión para normalización (misma idea que normalizeForTareaMerge en TS)
-- -----------------------------------------------------------------------------
create extension if not exists unaccent;

-- -----------------------------------------------------------------------------
-- 2) Columna merge_key (bases que aún no la tengan)
-- -----------------------------------------------------------------------------
alter table public.tareas add column if not exists merge_key text;

-- -----------------------------------------------------------------------------
-- 3) Función: calcular merge_key (debe coincidir con buildMergeKeyPreferTech TS)
-- -----------------------------------------------------------------------------
create or replace function public.tareas_compute_merge_key(
  p_titulo text,
  p_fase text,
  p_descripcion text
)
returns text
language sql
stable
as $fn$
  select case
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
          regexp_replace(lower(unaccent(trim(p_fase))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
    else
      trim(
        regexp_replace(
          regexp_replace(lower(unaccent(trim(coalesce(p_titulo, '')))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
      || '|||'
      || trim(
        regexp_replace(
          regexp_replace(lower(unaccent(trim(coalesce(p_fase, '')))), '[^a-z0-9]+', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
  end
  from (
    select coalesce(
      nullif(
        trim((regexp_match(coalesce(p_descripcion, ''), 'ID:\s*([A-Za-z0-9_-]+)', 'i'))[1]),
        ''
      ),
      nullif(
        trim((regexp_match(coalesce(p_descripcion, ''), 'Usar\s+["'']([A-Za-z0-9_-]+)["'']', 'i'))[1]),
        ''
      )
    ) as tech_id
  ) as tech;
$fn$;

comment on function public.tareas_compute_merge_key(text, text, text) is
  'Clave lógica estable: id técnico en descripción + fase, o título + fase (alineado con tarea-match-key.ts).';

-- -----------------------------------------------------------------------------
-- 4) Trigger: nunca persistir merge_key vacío (respaldo si el API falla)
-- -----------------------------------------------------------------------------
create or replace function public.tareas_set_merge_key_trg()
returns trigger
language plpgsql
as $trg$
begin
  if new.merge_key is null or length(trim(new.merge_key)) = 0 then
    new.merge_key := public.tareas_compute_merge_key(new.titulo, new.fase, new.descripcion);
  end if;
  return new;
end;
$trg$;

drop trigger if exists tareas_merge_key_biud on public.tareas;

create trigger tareas_merge_key_biud
  before insert or update on public.tareas
  for each row
  execute procedure public.tareas_set_merge_key_trg();

-- -----------------------------------------------------------------------------
-- 5) Quitar índice único temporalmente para poder recalcular sin violación
-- -----------------------------------------------------------------------------
drop index if exists public.tareas_merge_key_unique;

-- -----------------------------------------------------------------------------
-- 6) Backfill: todas las filas (incluye nulls y claves viejas solo por título)
-- -----------------------------------------------------------------------------
update public.tareas t
set merge_key = public.tareas_compute_merge_key(t.titulo, t.fase, t.descripcion);

-- -----------------------------------------------------------------------------
-- 7) Fusionar revisiones hacia la tarea keeper por merge_key
-- -----------------------------------------------------------------------------
with ranked as (
  select
    id,
    merge_key,
    row_number() over (
      partition by merge_key
      order by updated_at desc nulls last, created_at desc
    ) as rn
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

-- -----------------------------------------------------------------------------
-- 8) Eliminar filas duplicadas de tareas (perdedoras ya sin revisiones o ya movidas)
-- -----------------------------------------------------------------------------
with ranked as (
  select
    id,
    merge_key,
    row_number() over (
      partition by merge_key
      order by updated_at desc nulls last, created_at desc
    ) as rn
  from public.tareas
  where merge_key is not null
)
delete from public.tareas t
where t.id in (select id from ranked where rn > 1);

-- -----------------------------------------------------------------------------
-- 9) Índice único parcial (impide dos filas con el mismo merge_key no nulo)
-- -----------------------------------------------------------------------------
create unique index if not exists tareas_merge_key_unique
  on public.tareas (merge_key)
  where merge_key is not null;

-- -----------------------------------------------------------------------------
-- 10) RPC: upsert atómico por merge_key (carreras entre webhooks n8n)
--      Orden: bloqueo advisory → por merge_key → legado por id_tarea → INSERT … ON CONFLICT
-- -----------------------------------------------------------------------------
create or replace function public.upsert_tarea_by_merge_key(
  p_id_tarea text,
  p_titulo text,
  p_fase text,
  p_descripcion text,
  p_url_tarjeta text,
  p_merge_key text,
  p_updated_at timestamptz default now()
)
returns table (
  id uuid,
  id_tarea text
)
language plpgsql
security definer
set search_path = public
as $rpc$
declare
  v_merge text;
  v_tid text;
  rid uuid;
  kid uuid;
  v_url text;
begin
  v_tid := nullif(trim(p_id_tarea), '');
  if v_tid is null then
    raise exception 'id_tarea no puede estar vacío';
  end if;

  v_merge := nullif(trim(p_merge_key), '');
  if v_merge is null then
    v_merge := public.tareas_compute_merge_key(p_titulo, p_fase, p_descripcion);
  end if;

  v_url := nullif(trim(p_url_tarjeta), '');

  perform pg_advisory_xact_lock(7129431, hashtext(v_merge));

  -- A) Ya existe la tarea lógica
  select t.id
  into rid
  from public.tareas t
  where t.merge_key = v_merge
  order by t.updated_at desc nulls last, t.created_at desc
  limit 1;

  if rid is not null then
    update public.tareas t
    set
      titulo = p_titulo,
      fase = p_fase,
      descripcion = p_descripcion,
      url_tarjeta = coalesce(v_url, t.url_tarjeta),
      updated_at = coalesce(p_updated_at, now()),
      id_tarea = case
        when not exists (
          select 1 from public.tareas x where x.id_tarea = v_tid and x.id <> t.id
        ) then v_tid
        else t.id_tarea
      end
    where t.id = rid;

    return query
    select t.id, t.id_tarea from public.tareas t where t.id = rid;
    return;
  end if;

  -- B) Legado: fila por id_tarea de un flujo (merge_key distinto o null)
  select t.id into rid from public.tareas t where t.id_tarea = v_tid limit 1;

  if rid is not null then
    select k.id into kid
    from public.tareas k
    where k.merge_key = v_merge and k.id <> rid
    order by k.updated_at desc nulls last, k.created_at desc
    limit 1;

    if kid is not null then
      update public.revisiones r set tarea_id = kid where r.tarea_id = rid;
      delete from public.tareas where id = rid;

      update public.tareas t
      set
        titulo = p_titulo,
        fase = p_fase,
        descripcion = p_descripcion,
        url_tarjeta = coalesce(v_url, t.url_tarjeta),
        updated_at = coalesce(p_updated_at, now()),
        id_tarea = case
          when not exists (
            select 1 from public.tareas x where x.id_tarea = v_tid and x.id <> t.id
          ) then v_tid
          else t.id_tarea
        end
      where t.id = kid;

      return query select t.id, t.id_tarea from public.tareas t where t.id = kid;
      return;
    end if;

    update public.tareas t
    set
      merge_key = v_merge,
      titulo = p_titulo,
      fase = p_fase,
      descripcion = p_descripcion,
      url_tarjeta = coalesce(v_url, t.url_tarjeta),
      updated_at = coalesce(p_updated_at, now())
    where t.id = rid;

    return query select t.id, t.id_tarea from public.tareas t where t.id = rid;
    return;
  end if;

  -- C) Alta nueva + carrera entre dos inserts con el mismo merge_key
  return query
    insert into public.tareas (id_tarea, titulo, fase, descripcion, url_tarjeta, merge_key, updated_at)
    values (v_tid, p_titulo, p_fase, p_descripcion, v_url, v_merge, coalesce(p_updated_at, now()))
    on conflict (merge_key) where merge_key is not null
    do update set
      titulo = excluded.titulo,
      fase = excluded.fase,
      descripcion = excluded.descripcion,
      url_tarjeta = coalesce(excluded.url_tarjeta, tareas.url_tarjeta),
      updated_at = excluded.updated_at,
      id_tarea = case
        when not exists (
          select 1 from public.tareas x where x.id_tarea = excluded.id_tarea and x.id <> tareas.id
        ) then excluded.id_tarea
        else tareas.id_tarea
      end
    returning tareas.id, tareas.id_tarea;

  return;
end;
$rpc$;

comment on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) is
  'Unificación robusta: advisory lock + merge_key; respeta id_tarea único al actualizar.';

-- Permisos (API con anon key / service role según tu configuración)
grant execute on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) to anon;
grant execute on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) to service_role;
