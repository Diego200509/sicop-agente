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
