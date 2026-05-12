import { NextResponse } from "next/server";

import { getReportesSeguimiento } from "@/src/services/reportesSeguimientoService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reportes = await getReportesSeguimiento();
    return NextResponse.json({ data: reportes }, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/reportes-seguimiento:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los reportes de seguimiento" },
      { status: 500 },
    );
  }
}
