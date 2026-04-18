-- Ejecutar si `merge_key` quedó NULL (alineado con buildMergeKeyPreferTech en JS):
-- si en descripción hay `ID: DS1` o Usar "DS1", la clave es `ds1|||fase` (no depende del título del webhook).
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
