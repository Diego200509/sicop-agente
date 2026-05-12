import { NextResponse } from "next/server";

import { getReporteSeguimientoById } from "@/src/services/reportesSeguimientoService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reporte = await getReporteSeguimientoById(id);

    if (!reporte) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: reporte }, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/reportes-seguimiento/[id]:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el reporte de seguimiento" },
      { status: 500 },
    );
  }
}
