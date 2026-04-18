import { NextResponse } from "next/server";

import { getSupabaseClient } from "@/src/lib/supabase/client";
import { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import { TareasRepository } from "@/src/repositories/tareas.repository";
import { ConclusionService } from "@/src/services/conclusion.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteParams) {
  try {
    const { id: idParam } = await params;
    const supabase = getSupabaseClient();
    const tareasRepo = new TareasRepository(supabase);
    const revisionesRepo = new RevisionesRepository(supabase);

    const uuid = await tareasRepo.resolveTareaUuid(idParam);
    if (!uuid) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    const service = new ConclusionService(tareasRepo, revisionesRepo);
    const data = await service.generateForTareaUuid(uuid);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("POST /api/tareas/[id]/conclusion:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo generar la conclusion" },
      { status: 500 },
    );
  }
}
