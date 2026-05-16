"use client";

import { useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";

import { AppPageShell } from "@/src/components/layout/app-page-shell";
import { EmptyState } from "@/src/components/ui/empty-state";
import { BudgetDetailView } from "@/src/features/budget/components/budget-detail-view";
import { BudgetHistoryTable } from "@/src/features/budget/components/budget-history-table";
import { BudgetReportSelector } from "@/src/features/budget/components/budget-report-selector";
import { SectionCard } from "@/src/features/budget/components/section-card";
import type { BudgetReport } from "@/src/features/budget/types/budget.types";
import { formatBudgetDate } from "@/src/features/budget/utils/budget-formatters";

type BudgetPageViewProps = {
  reportes: BudgetReport[];
  initialReporteId?: string | null;
  initialError?: string | null;
};

export function BudgetPageView({ reportes, initialReporteId, initialError }: BudgetPageViewProps) {
  const selectedReportRef = useRef<HTMLDivElement | null>(null);
  const fallbackReporteId = reportes[0]?.id ?? "";
  const initialId = initialReporteId && reportes.some((reporte) => reporte.id === initialReporteId)
    ? initialReporteId
    : fallbackReporteId;
  const [selectedReporteId, setSelectedReporteId] = useState(initialId);

  const selectedReporte = useMemo(
    () => reportes.find((reporte) => reporte.id === selectedReporteId) ?? reportes[0] ?? null,
    [reportes, selectedReporteId],
  );

  const selectReporte = (id: string) => {
    setSelectedReporteId(id);
    window.history.replaceState(null, "", `/presupuesto?reporteId=${encodeURIComponent(id)}`);
    window.requestAnimationFrame(() => {
      selectedReportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <AppPageShell
      title="Control Presupuestario"
      description="Seguimiento del presupuesto del proyecto SICOP basado en los reportes automaticos generados por el agente."
      className="gap-6"
    >
      {initialError ? (
        <EmptyState
          tone="error"
          icon={FileText}
          title="No se pudo cargar el presupuesto"
          description={initialError}
        />
      ) : null}

      {!initialError && reportes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aun no existen reportes presupuestarios."
          description="Cuando n8n genere reportes de seguimiento, el ultimo presupuesto disponible aparecera aqui."
        />
      ) : null}

      {selectedReporte ? (
        <>
          <div ref={selectedReportRef}>
            <SectionCard
              title="Reporte seleccionado"
              description={`Fecha de revision: ${formatBudgetDate(selectedReporte.fecha_revision)}`}
            >
              <BudgetReportSelector
                reportes={reportes}
                selectedReporteId={selectedReporte.id}
                onChange={selectReporte}
              />
            </SectionCard>
          </div>

          <BudgetDetailView reporte={selectedReporte} />

          <SectionCard title="Historial presupuestario" description="Ultimos reportes generados por el agente SICOP.">
            <BudgetHistoryTable
              reportes={reportes}
              selectedReporteId={selectedReporte.id}
              onSelect={selectReporte}
            />
          </SectionCard>
        </>
      ) : null}
    </AppPageShell>
  );
}
