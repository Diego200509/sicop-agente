import { NextResponse } from "next/server";

import { getSupabaseClient } from "@/src/lib/supabase/client";
import { TareaRepository } from "@/src/repositories/tarea.repository";

export async function GET() {
  try {
    const repository = new TareaRepository(getSupabaseClient());
    const dashboard = await repository.getDashboardData();
    return NextResponse.json({ data: dashboard }, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/dashboard:", error);
    return NextResponse.json({ error: "No se pudo obtener el dashboard" }, { status: 500 });
  }
}
