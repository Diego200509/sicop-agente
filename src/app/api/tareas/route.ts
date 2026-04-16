import { NextResponse } from "next/server";

import { getSupabaseClient } from "@/src/lib/supabase/client";
import { TareaRepository } from "@/src/repositories/tarea.repository";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") ?? undefined;

    const repository = new TareaRepository(getSupabaseClient());
    const tareas = await repository.listTareas(search);

    return NextResponse.json({ data: tareas }, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/tareas:", error);
    return NextResponse.json({ error: "No se pudieron obtener las tareas" }, { status: 500 });
  }
}
