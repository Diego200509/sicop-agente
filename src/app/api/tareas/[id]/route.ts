import { NextResponse } from "next/server";

import { getSupabaseClient } from "@/src/lib/supabase/client";
import { TareaRepository } from "@/src/repositories/tarea.repository";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const repository = new TareaRepository(getSupabaseClient());
    const tarea = await repository.getTareaDetail(id);

    if (!tarea) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: tarea }, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/tareas/[id]:", error);
    return NextResponse.json({ error: "No se pudo obtener el detalle de tarea" }, { status: 500 });
  }
}
