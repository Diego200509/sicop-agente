"use client";

import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Inbox,
  ListChecks,
  Mail,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppPageShell } from "@/src/components/layout/app-page-shell";
import { BudgetSection } from "@/src/components/reportes/budget-section";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useReportesSeguimiento } from "@/src/hooks/useReportesSeguimiento";
import { cn } from "@/src/lib/utils";
import type {
  ReporteSeguimiento,
  ReporteSeguimientoEstado,
} from "@/src/types/reporte-seguimiento";

type DetailTab = "pdf" | "html" | "metadata";
const TOTAL_TAREAS_ANALIZADAS = 22;

const estadoOptions = [
  { value: "todos", label: "Todos" },
  { value: "generado", label: "Generado" },
  { value: "enviado", label: "Enviado" },
  { value: "error", label: "Error" },
] as const;

const metricLabels = {
  total_tareas: "Total tareas",
  tareas_completadas: "Completadas",
  tareas_en_curso: "En curso",
  tareas_en_plazo: "En plazo",
  tareas_proximas: "Próximas",
  tareas_atrasadas: "Atrasadas",
  tareas_sin_fecha: "Sin fecha",
} as const;

type ReportesSeguimientoViewProps = {
  initialReportes?: ReporteSeguimiento[];
  initialError?: string | null;
  initialLoaded?: boolean;
};

export function ReportesSeguimientoView({
  initialReportes,
  initialError,
  initialLoaded,
}: ReportesSeguimientoViewProps) {
  const {
    reportesFiltrados,
    resumen,
    loading,
    error,
    search,
    setSearch,
    estado,
    setEstado,
    refresh,
  } = useReportesSeguimiento({ initialReportes, initialError, initialLoaded });
  const [selectedReporte, setSelectedReporte] = useState<ReporteSeguimiento | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("pdf");

  const openDetail = (reporte: ReporteSeguimiento, tab: DetailTab = "pdf") => {
    setSelectedReporte(reporte);
    setDetailTab(tab);
  };

  return (
    <AppPageShell
      title="Reportes de Seguimiento"
      description="Historial de reportes automáticos generados por el agente SICOP."
      className="gap-6"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Total de reportes" value={resumen.totalReportes} icon={FileText} tone="zinc" />
        <SummaryCard
          label="Último reporte generado"
          value={resumen.ultimoReporte ? formatDateEcuador(resumen.ultimoReporte.created_at, "Sin fecha", { includeTime: true }) : "Sin registros"}
          icon={CalendarClock}
          tone="blue"
          compact
        />
        <SummaryCard label="Total de tareas analizadas" value={resumen.totalTareas} icon={ListChecks} tone="sky" />
        <SummaryCard label="Tareas completadas" value={resumen.tareasCompletadas} icon={CheckCircle2} tone="emerald" />
        <SummaryCard label="Tareas en curso" value={resumen.tareasEnCurso} icon={Activity} tone="sky" />
        <SummaryCard label="Tareas en plazo" value={resumen.tareasEnPlazo} icon={Clock3} tone="blue" />
        <SummaryCard label="Tareas próximas" value={resumen.tareasProximas} icon={CalendarClock} tone="sky" />
        <SummaryCard label="Tareas atrasadas" value={resumen.tareasAtrasadas} icon={AlertTriangle} tone="rose" />
        <SummaryCard label="Tareas sin fecha" value={resumen.tareasSinFecha} icon={Inbox} tone="amber" />
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, asunto o destinatario..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950/60">
              {estadoOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEstado(option.value)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    estado === option.value
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button type="button" variant="ghost" onClick={refresh} className="gap-2">
              <RefreshCw className="size-4" aria-hidden />
              Actualizar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Cargando reportes...
          </div>
        ) : null}

        {error ? (
          <EmptyState
            tone="error"
            icon={AlertTriangle}
            title="Error al cargar reportes"
            description={error}
            action={
              <Button type="button" onClick={refresh} className="gap-2">
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </Button>
            }
          />
        ) : null}

        {!loading && !error && reportesFiltrados.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aún no existen reportes generados."
            description={search.trim() || estado !== "todos" ? "No hay coincidencias con los filtros actuales." : undefined}
          />
        ) : null}

        {!loading && !error && reportesFiltrados.length > 0 ? (
          <div className="scrollbar-elegant overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-100/80 hover:bg-zinc-100/80 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/80">
                  <TableHead>Fecha de revisión</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-right">Total tareas</TableHead>
                  <TableHead className="text-right">Completadas</TableHead>
                  <TableHead className="text-right">En curso</TableHead>
                  <TableHead className="text-right">En plazo</TableHead>
                  <TableHead className="text-right">Próximas</TableHead>
                  <TableHead className="text-right">Atrasadas</TableHead>
                  <TableHead className="text-right">Sin fecha</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportesFiltrados.map((reporte) => (
                  <TableRow key={reporte.id} className="bg-white/90 dark:bg-zinc-950/20">
                    <TableCell className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {formatDateEcuador(reporte.fecha_revision)}
                    </TableCell>
                    <TableCell className="min-w-[16rem] max-w-[22rem]">
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">{reporte.titulo}</p>
                        <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {reporte.asunto || reporte.archivo_nombre || "Sin asunto registrado"}
                        </p>
                      </div>
                    </TableCell>
                    <MetricCell value={TOTAL_TAREAS_ANALIZADAS} />
                    <MetricCell value={reporte.tareas_completadas} />
                    <MetricCell value={reporte.tareas_en_curso ?? 0} />
                    <MetricCell value={reporte.tareas_en_plazo} />
                    <MetricCell value={reporte.tareas_proximas} />
                    <MetricCell value={reporte.tareas_atrasadas} />
                    <MetricCell value={reporte.tareas_sin_fecha} />
                    <TableCell className="min-w-[14rem] max-w-[18rem] truncate text-zinc-600 dark:text-zinc-400">
                      {reporte.destinatarios || reporte.enviado_a || "Sin destinatarios"}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={reporte.estado} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <IconAction label="Ver detalle" onClick={() => openDetail(reporte, "pdf")}>
                          <Eye className="size-4" aria-hidden />
                        </IconAction>
                        <IconAction
                          label="Ver PDF"
                          onClick={() => (reporte.archivo_url ? window.open(reporte.archivo_url, "_blank", "noopener,noreferrer") : openDetail(reporte, "pdf"))}
                        >
                          <ExternalLink className="size-4" aria-hidden />
                        </IconAction>
                        <IconLink
                          label="Descargar PDF"
                          href={reporte.archivo_url}
                          download={reporte.archivo_nombre || "reporte-seguimiento-sicop.pdf"}
                          disabled={!reporte.archivo_url}
                        >
                          <Download className="size-4" aria-hidden />
                        </IconLink>
                        <IconAction label="Ver HTML enviado" onClick={() => openDetail(reporte, "html")}>
                          <Mail className="size-4" aria-hidden />
                        </IconAction>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </Card>

      <Card className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Sección secundaria</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Los reportes con URL pública muestran una vista previa real del PDF almacenado en Supabase Storage.
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <SecondaryMetric label="Con PDF" value={reportesFiltrados.filter((reporte) => reporte.archivo_url).length} />
          <SecondaryMetric label="Sin PDF" value={reportesFiltrados.filter((reporte) => !reporte.archivo_url).length} />
          <SecondaryMetric label="Visibles" value={reportesFiltrados.length} />
        </div>
      </Card>

      {selectedReporte ? (
        <ReporteDetalleModal
          reporte={selectedReporte}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={() => setSelectedReporte(null)}
        />
      ) : null}
    </AppPageShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  compact,
}: {
  label: string;
  value: number | string;
  icon: typeof FileText;
  tone: "zinc" | "blue" | "sky" | "emerald" | "rose" | "amber";
  compact?: boolean;
}) {
  const toneClass = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
  }[tone];

  return (
    <Card className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <p
          className={cn(
            "truncate font-bold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50",
            compact ? "text-lg" : "text-2xl",
          )}
          title={String(value)}
        >
          {value}
        </p>
      </div>
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", toneClass)}>
        <Icon className="size-5" aria-hidden />
      </div>
    </Card>
  );
}

function MetricCell({ value }: { value: number }) {
  return <TableCell className="text-right font-medium tabular-nums">{value}</TableCell>;
}

function EstadoBadge({ estado }: { estado: ReporteSeguimientoEstado }) {
  const variant = estado === "enviado" ? "success" : estado === "error" ? "danger" : "secondary";

  return (
    <Badge variant={variant} className="capitalize">
      {estado}
    </Badge>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      {children}
    </button>
  );
}

function IconLink({
  label,
  href,
  download,
  disabled,
  children,
}: {
  label: string;
  href?: string | null;
  download: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled || !href) {
    return (
      <span
        title={label}
        aria-label={label}
        className="inline-flex size-9 items-center justify-center rounded-md text-zinc-300 dark:text-zinc-700"
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      download={download}
      title={label}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      {children}
    </a>
  );
}

function SecondaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export function KpiReportSection({ reporte }: { reporte: ReporteSeguimiento }) {
  const individualKpis = [
    { label: "Cumplimiento cronograma", value: reporte.kpi_cumplimiento_cronograma },
    { label: "Tasa de defectos", value: reporte.kpi_tasa_defectos },
    { label: "Productividad equipo", value: reporte.kpi_productividad_equipo },
    { label: "Cumplimiento requerimientos", value: reporte.kpi_cumplimiento_requerimientos },
    { label: "Eficiencia flujo", value: reporte.kpi_eficiencia_flujo },
  ].filter((item): item is { label: string; value: number } => typeof item.value === "number" && Number.isFinite(item.value));
  const hasResumen = hasJsonContent(reporte.resumen_kpis);
  const hasKpis = hasJsonContent(reporte.kpis);

  if (individualKpis.length === 0 && !hasResumen && !hasKpis) {
    return (
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="rounded-md border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Este reporte no contiene resumen_kpis ni KPIs registrados.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Indicadores Clave de Desempeño (KPI)
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Datos registrados en el último reporte automático.
        </p>
      </div>

      {individualKpis.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {individualKpis.map((item) => (
            <div key={item.label} className="rounded-md border border-zinc-200 px-3 py-3 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                {formatPercent(item.value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <JsonSummaryBlock
          title="Resumen KPIs"
          value={reporte.resumen_kpis}
          emptyText="El reporte no contiene resumen_kpis detallado. Se usan los KPIs principales como respaldo."
        />
        <JsonSummaryBlock
          title="KPIs registrados"
          value={reporte.kpis}
          emptyText="No hay objeto kpis registrado para este reporte."
        />
      </div>
    </div>
  );
}

function JsonSummaryBlock({
  title,
  value,
  emptyText,
}: {
  title: string;
  value: unknown;
  emptyText: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{title}</p>
      {hasJsonContent(value) ? (
        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
          {formatJson(value)}
        </pre>
      ) : (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      )}
    </div>
  );
}

function ReporteDetalleModal({
  reporte,
  activeTab,
  onTabChange,
  onClose,
}: {
  reporte: ReporteSeguimiento;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onClose: () => void;
}) {
  const html = reporte.mensaje_html || reporte.html_reporte || "";
  const metadataText = useMemo(() => JSON.stringify(reporte.metadata ?? {}, null, 2), [reporte.metadata]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-3 sm:p-6">
      <div className="w-full max-w-6xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge estado={reporte.estado} />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {reporte.tipo_reporte}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{reporte.titulo}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {reporte.asunto || "Sin asunto registrado"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            aria-label="Cerrar detalle"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="grid gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Fecha de revisión" value={formatDateEcuador(reporte.fecha_revision)} />
          <InfoItem label="Enviado en" value={formatDateEcuador(reporte.enviado_en, "Sin envío registrado")} />
          <InfoItem label="Destinatarios" value={reporte.destinatarios || reporte.enviado_a || "Sin destinatarios"} />
          <InfoItem label="Archivo" value={reporte.archivo_nombre || "Sin archivo registrado"} />
        </div>

        <div className="grid gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(metricLabels) as Array<keyof typeof metricLabels>).map((key) => (
            <SecondaryMetric
              key={key}
              label={metricLabels[key]}
              value={key === "total_tareas" ? TOTAL_TAREAS_ANALIZADAS : (reporte[key] ?? 0)}
            />
          ))}
        </div>

        <BudgetSection reporte={reporte} />

        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <TabButton active={activeTab === "pdf"} onClick={() => onTabChange("pdf")}>
              PDF
            </TabButton>
            <TabButton active={activeTab === "html"} onClick={() => onTabChange("html")}>
              HTML enviado
            </TabButton>
            <TabButton active={activeTab === "metadata"} onClick={() => onTabChange("metadata")}>
              Metadata técnica
            </TabButton>
          </div>

          <div className="flex flex-wrap gap-2">
            {reporte.archivo_url ? (
              <>
                <a
                  href={reporte.archivo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Abrir PDF en nueva pestaña
                </a>
                <a
                  href={reporte.archivo_url}
                  download={reporte.archivo_nombre || "reporte-seguimiento-sicop.pdf"}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Download className="size-4" aria-hidden />
                  Descargar PDF
                </a>
              </>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onTabChange("html")} className="gap-2">
              <Mail className="size-4" aria-hidden />
              Ver HTML enviado
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "pdf" ? (
            reporte.archivo_url ? (
              <iframe
                src={reporte.archivo_url}
                className="h-[700px] w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
                title={`Vista previa PDF ${reporte.titulo}`}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="El PDF no está almacenado. Solo se conserva el HTML del reporte."
              />
            )
          ) : null}

          {activeTab === "html" ? (
            html ? (
              <>
                <style>{`
                  .report-html-preview {
                    color: #222222;
                    color-scheme: light;
                  }

                  .report-html-preview :where(div, section, article, main, body) {
                    color: inherit;
                  }

                  .report-html-preview a {
                    color: #1d4ed8;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                  }

                  .report-html-preview table {
                    width: 100%;
                    border-collapse: collapse;
                    color: #2b2b2b;
                  }

                  .report-html-preview th {
                    color: #222222;
                    font-weight: 700;
                  }

                  .report-html-preview td,
                  .report-html-preview th {
                    padding: 8px 10px;
                    vertical-align: top;
                  }
                `}</style>
                <div
                  className="report-html-preview max-h-[700px] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-sm shadow-inner dark:border-zinc-800"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </>
            ) : (
              <EmptyState icon={Mail} title="No hay HTML registrado para este reporte." />
            )
          ) : null}

          {activeTab === "metadata" ? (
            <pre className="max-h-[700px] overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100 dark:border-zinc-800">
              {metadataText}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-zinc-950 dark:text-zinc-50" title={value}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

function formatDateEcuador(
  value: string | null | undefined,
  fallback = "Sin fecha",
  options: { includeTime?: boolean } = {},
) {
  if (!value) return fallback;

  const date = parseDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: options.includeTime && hasTime(value) ? "short" : undefined,
    timeZone: "America/Guayaquil",
  })
    .format(date)
    .replace(/\u00a0/g, " ");
}

function parseDate(value: string): Date | null {
  const trimmedValue = value.trim();
  const simpleDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmedValue);

  if (simpleDateMatch) {
    const [, day, month, year] = simpleDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasJsonContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0 && value.trim() !== "{}";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatJson(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "No disponible";
  }
}

function formatPercent(value: number): string {
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(percentValue) ? 0 : 1,
  }).format(percentValue)}%`;
}

function hasTime(value: string): boolean {
  return /T\d{2}:\d{2}| \d{2}:\d{2}/.test(value);
}
