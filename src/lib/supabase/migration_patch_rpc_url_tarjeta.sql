-- =============================================================================
-- Parche: política url_tarjeta en RPC (bases que YA ejecutaron migration_fix… sin bloque 9b).
-- Ejecutar en Supabase SQL Editor. Alineado con src/lib/url-tarjeta.ts.
--
-- IMPORTANTE: ejecuta TODO el archivo de una sola vez (selección completa → Run).
-- Si ejecutas solo una línea suelta (p. ej. `delete from public.tareas where id = v_rid`),
-- verás: ERROR 42P01: relation "v_rid" does not exist — porque `v_rid` es variable PL/pgSQL
-- dentro de la función, no una tabla.
--
-- Si el SQL Editor parte mal el PL/pgSQL y ves `relation "v_rid" does not exist`, ejecuta
-- en DOS pasos los archivos sin comentarios extra:
--   1) migration_patch_supabase_editor_part1_helpers.sql
--   2) migration_patch_supabase_editor_part2_rpc.sql
-- La RPC usa delimitador único `$UpsertTareaByMergeKeyBody$` (no aparece en el cuerpo).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (misma semántica que chooseBestUrlTarjeta en Node)
-- -----------------------------------------------------------------------------
create or replace function public.tareas_is_http_url(p text)
returns boolean
language sql
immutable
as $$
  select
    length(btrim(coalesce(p, ''))) > 0
    and btrim(p) ~* '^https?://';
$$;

create or replace function public.tareas_choose_best_url_tarjeta(p_current text, p_incoming text)
returns text
language plpgsql
immutable
as $$
declare
  c text := btrim(coalesce(p_current, ''));
  i text := btrim(coalesce(p_incoming, ''));
  cur_ok boolean;
  inc_ok boolean;
begin
  cur_ok := public.tareas_is_http_url(c);
  inc_ok := public.tareas_is_http_url(i);

  if cur_ok and not inc_ok then
    return nullif(c, '');
  end if;
  if inc_ok and not cur_ok then
    return nullif(i, '');
  end if;
  if cur_ok and inc_ok then
    return nullif(c, '');
  end if;
  if length(c) > 0 then
    return c;
  end if;
  if length(i) > 0 then
    return i;
  end if;
  return null;
end;
$$;

comment on function public.tareas_choose_best_url_tarjeta(text, text) is
  'Fusiona url_tarjeta existente vs payload n8n; alineado con chooseBestUrlTarjeta (Node).';

-- -----------------------------------------------------------------------------
-- RPC completa (reemplaza definición anterior)
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
as $UpsertTareaByMergeKeyBody$
declare
  v_merge text;
  v_tid text;
  v_rid uuid;
  v_kid uuid;
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

  select t.id
  into v_rid
  from public.tareas t
  where t.merge_key = v_merge
  order by t.updated_at desc nulls last, t.created_at desc
  limit 1;

  if v_rid is not null then
    update public.tareas t
    set
      titulo = p_titulo,
      fase = p_fase,
      descripcion = p_descripcion,
      url_tarjeta = public.tareas_choose_best_url_tarjeta(t.url_tarjeta, v_url),
      updated_at = coalesce(p_updated_at, now()),
      id_tarea = case
        when not exists (
          select 1 from public.tareas x where x.id_tarea = v_tid and x.id <> t.id
        ) then v_tid
        else t.id_tarea
      end
    where t.id = v_rid;

    return query
    select t.id, t.id_tarea from public.tareas t where t.id = v_rid;
    return;
  end if;

  select t.id into v_rid from public.tareas t where t.id_tarea = v_tid limit 1;

  if v_rid is not null then
    select k.id into v_kid
    from public.tareas k
    where k.merge_key = v_merge and k.id <> v_rid
    order by k.updated_at desc nulls last, k.created_at desc
    limit 1;

    if v_kid is not null then
      update public.revisiones r set tarea_id = v_kid where r.tarea_id = v_rid;
      delete from public.tareas where id = v_rid;

      update public.tareas t
      set
        titulo = p_titulo,
        fase = p_fase,
        descripcion = p_descripcion,
        url_tarjeta = public.tareas_choose_best_url_tarjeta(t.url_tarjeta, v_url),
        updated_at = coalesce(p_updated_at, now()),
        id_tarea = case
          when not exists (
            select 1 from public.tareas x where x.id_tarea = v_tid and x.id <> t.id
          ) then v_tid
          else t.id_tarea
        end
      where t.id = v_kid;

      return query select t.id, t.id_tarea from public.tareas t where t.id = v_kid;
      return;
    end if;

    update public.tareas t
    set
      merge_key = v_merge,
      titulo = p_titulo,
      fase = p_fase,
      descripcion = p_descripcion,
      url_tarjeta = public.tareas_choose_best_url_tarjeta(t.url_tarjeta, v_url),
      updated_at = coalesce(p_updated_at, now())
    where t.id = v_rid;

    return query select t.id, t.id_tarea from public.tareas t where t.id = v_rid;
    return;
  end if;

  return query
    insert into public.tareas (id_tarea, titulo, fase, descripcion, url_tarjeta, merge_key, updated_at)
    values (
      v_tid,
      p_titulo,
      p_fase,
      p_descripcion,
      public.tareas_choose_best_url_tarjeta(null::text, v_url),
      v_merge,
      coalesce(p_updated_at, now())
    )
    on conflict (merge_key) where merge_key is not null
    do update set
      titulo = excluded.titulo,
      fase = excluded.fase,
      descripcion = excluded.descripcion,
      url_tarjeta = public.tareas_choose_best_url_tarjeta(tareas.url_tarjeta, excluded.url_tarjeta),
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
$UpsertTareaByMergeKeyBody$;

comment on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) is
  'Unificación robusta: advisory lock + merge_key; id_tarea único; url_tarjeta vía tareas_choose_best_url_tarjeta.';

grant execute on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) to anon;
grant execute on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.upsert_tarea_by_merge_key(text, text, text, text, text, text, timestamptz) to service_role;
