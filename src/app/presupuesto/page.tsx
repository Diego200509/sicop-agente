import { BudgetPageView } from "@/src/features/budget/views/budget-page-view";
import { getBudgetReports } from "@/src/services/reportesSeguimientoService";
import type { ReporteSeguimiento } from "@/src/types/reporte-seguimiento";

export const dynamic = "force-dynamic";

type PresupuestoPageProps = {
  searchParams: Promise<{ reporteId?: string | string[] }>;
};

export default async function PresupuestoPage({ searchParams }: PresupuestoPageProps) {
  let initialError: string | null = null;
  let reportes: ReporteSeguimiento[] = [];
  const params = await searchParams;
  const reporteId = Array.isArray(params.reporteId) ? params.reporteId[0] : params.reporteId;

  try {
    reportes = await getBudgetReports();
  } catch (error) {
    console.error("Error cargando /presupuesto:", error);
    initialError = "No se pudieron cargar los reportes presupuestarios";
  }

  return (
    <BudgetPageView
      reportes={reportes}
      initialReporteId={reporteId ?? null}
      initialError={initialError}
    />
  );
}

