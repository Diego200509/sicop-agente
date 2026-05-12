import { ReportesSeguimientoView } from "@/src/components/reportes/reportes-seguimiento-view";
import { getReportesSeguimiento } from "@/src/services/reportesSeguimientoService";
import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";

export const dynamic = "force-dynamic";

export default async function ReportesSeguimientoPage() {
  let initialError: string | null = null;
  let reportes: ReporteSeguimiento[] = [];

  try {
    reportes = await getReportesSeguimiento();
  } catch (error) {
    console.error("Error cargando /reportes-seguimiento:", error);
    initialError = "No se pudieron cargar los reportes de seguimiento";
  }

  return (
    <ReportesSeguimientoView
      initialReportes={reportes}
      initialError={initialError}
      initialLoaded={initialError == null}
    />
  );
}
