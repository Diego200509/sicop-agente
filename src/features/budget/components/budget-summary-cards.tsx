import { DollarSign, Gauge, LineChart, PiggyBank, ReceiptText, TrendingUp, type LucideIcon } from "lucide-react";

import { MetricCard } from "@/src/features/budget/components/metric-card";
import type { BudgetReport } from "@/src/features/budget/types/budget.types";
import {
  formatCurrency,
  formatPercent,
  getBudgetStatusColor,
  getBudgetStatusLabel,
} from "@/src/features/budget/utils/budget-formatters";
import { getBudgetNumber, getBudgetRecord } from "@/src/features/budget/utils/budget-mappers";

type BudgetSummaryCardsProps = {
  reporte: BudgetReport;
  includeRegisteredEstimate?: boolean;
};

export function BudgetSummaryCards({ reporte, includeRegisteredEstimate = false }: BudgetSummaryCardsProps) {
  const budget = getBudgetRecord(reporte);
  const registeredEstimate = getBudgetNumber(budget, [
    "costo_estimado_registrado",
    "presupuesto_estimado_registrado",
    "costo_registrado_estimado",
  ]);
  const items: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    tone: "emerald" | "blue" | "rose" | "sky" | "zinc" | "amber";
  }> = [
    {
      label: "Presupuesto estimado total del proyecto",
      value: formatCurrency(reporte.presupuesto_total ?? 0),
      icon: PiggyBank,
      tone: "sky" as const,
    },
    {
      label: "Costo real acumulado",
      value: formatCurrency(reporte.costo_real_total ?? 0),
      icon: ReceiptText,
      tone: "zinc" as const,
    },
    {
      label: "Variacion o saldo disponible",
      value: formatCurrency(reporte.variacion_costo ?? 0),
      icon: LineChart,
      tone: getBudgetStatusColor(reporte.estado_presupuesto),
    },
    {
      label: "Ejecucion presupuestaria real",
      value: `${formatPercent(reporte.ejecucion_presupuestaria ?? 0)}%`,
      icon: Gauge,
      tone: (reporte.ejecucion_presupuestaria ?? 0) > 100 ? ("rose" as const) : ("emerald" as const),
    },
    {
      label: "Estado presupuestario",
      value: getBudgetStatusLabel(reporte.estado_presupuesto),
      icon: DollarSign,
      tone: getBudgetStatusColor(reporte.estado_presupuesto),
    },
  ];

  if (includeRegisteredEstimate && registeredEstimate != null) {
    items.push({
      label: "Costo estimado registrado",
      value: formatCurrency(registeredEstimate),
      icon: TrendingUp,
      tone: "amber",
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MetricCard key={item.label} {...item} />
      ))}
    </div>
  );
}
