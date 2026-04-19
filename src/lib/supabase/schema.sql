-- Instalación mínima. Para unificación documental/código (merge_key + RPC + trigger),
-- ejecuta además: src/lib/supabase/migration_fix_tareas_merge_key_unificado.sql

create extension if not exists "pgcrypto";

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  id_tarea text not null unique,
  titulo text not null,
  fase text not null,
  descripcion text not null,
  url_tarjeta text,
  /** Orden manual dentro de la misma fase (tablero Kanban). */
  orden integer,
  /** Dedupe documental/código: misma tarjeta lógica aunque n8n envíe distintos id_tarea (ver tarea-match-key). */
  merge_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tareas_id_tarea_not_empty check (length(trim(id_tarea)) > 0),
  constraint tareas_titulo_not_empty check (length(trim(titulo)) > 0),
  constraint tareas_fase_not_empty check (length(trim(fase)) > 0),
  constraint tareas_descripcion_not_empty check (length(trim(descripcion)) > 0)
);

create table if not exists public.revisiones (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  tipo_revision text not null check (tipo_revision in ('documental', 'codigo')),

  texto_pdf text,
  analisis_documental text,

  pr_number text,
  pr_title text,
  repo_owner text,
  repo_name text,
  codigo_pr text,
  analisis_codigo text,

  fecha_revision timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint revisiones_documental_valida check (
    tipo_revision <> 'documental'
    or (
      texto_pdf is not null
      and analisis_documental is not null
      and length(trim(texto_pdf)) > 0
      and length(trim(analisis_documental)) > 0
    )
  ),

  constraint revisiones_codigo_valida check (
    tipo_revision <> 'codigo'
    or (
      analisis_codigo is not null
      and length(trim(analisis_codigo)) > 0
    )
  )
);

create index if not exists idx_tareas_id_tarea
  on public.tareas(id_tarea);

create unique index if not exists tareas_merge_key_unique
  on public.tareas(merge_key)
  where merge_key is not null;

create index if not exists idx_revisiones_tarea_id
  on public.revisiones(tarea_id);

create index if not exists idx_revisiones_tipo_revision
  on public.revisiones(tipo_revision);

create index if not exists idx_revisiones_fecha_revision
  on public.revisiones(fecha_revision desc);

create table if not exists public.mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid references public.tareas(id) on delete cascade,
  rol text not null check (rol in ('user', 'assistant')),
  mensaje text not null,
  created_at timestamptz not null default now(),

  constraint mensajes_chat_mensaje_not_empty check (length(trim(mensaje)) > 0)
);

create index if not exists idx_mensajes_chat_tarea_id
  on public.mensajes_chat(tarea_id);

create index if not exists idx_mensajes_chat_created_at
  on public.mensajes_chat(created_at desc);
