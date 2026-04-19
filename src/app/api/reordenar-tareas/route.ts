import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { normalizePhase } from "@/src/lib/fases";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import { TareaRepository } from "@/src/repositories/tarea.repository";
import { tareasReordenarBodySchema } from "@/src/services/tareas-reordenar.schema";

/**
 * Actualiza el campo `orden` de varias tareas de una misma fase (columna del tablero).
 * Ruta fuera de `/api/tareas/[id]` para evitar que el segmento `reordenar` se confunda con un UUID.
 */
async function handleReordenar(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = tareasReordenarBodySchema.parse(body);

    if (parsed.faseColumnKey === "__otras__") {
      return NextResponse.json({ error: "No se puede reordenar la columna Otras fases desde la API" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const repo = new TareaRepository(supabase);
    const ids = parsed.items.map((i) => i.id);

    const { data: rows, error: selError } = await supabase.from("tareas").select("id,fase").in("id", ids);
    if (selError) {
      return NextResponse.json({ error: "No se pudieron validar las tareas" }, { status: 500 });
    }

    const found = (rows ?? []) as Array<{ id: string; fase: string }>;
    if (found.length !== ids.length) {
      return NextResponse.json({ error: "Alguna tarea no existe o no se pudo leer" }, { status: 400 });
    }

    const expectedKey = normalizePhase(parsed.faseColumnKey);
    for (const row of found) {
      if (normalizePhase(row.fase) !== expectedKey) {
        return NextResponse.json(
          { error: "Todas las tareas deben pertenecer a la misma fase que la columna indicada" },
          { status: 400 },
        );
      }
    }

    await repo.updateOrdenBatch(parsed.items);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("POST/PATCH /api/reordenar-tareas:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalido", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al reordenar" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handleReordenar(request);
}

export async function PATCH(request: Request) {
  return handleReordenar(request);
}
