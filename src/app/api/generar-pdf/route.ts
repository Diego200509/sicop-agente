import React, { type ReactElement } from "react";
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { HTMLElement, NodeType, parse, type Node as HtmlNode } from "node-html-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportMetadata = {
  total_tareas?: number;
  tareas_completadas?: number;
  tareas_proximas?: number;
  tareas_atrasadas?: number;
  tareas_sin_fecha?: number;
  tareas_en_plazo?: number;
  kpis?: unknown;
  kpi_cumplimiento_cronograma?: number | string;
  kpi_tasa_defectos?: number | string;
  kpi_productividad_equipo?: number | string;
  kpi_cumplimiento_requerimientos?: number | string;
  kpi_eficiencia_flujo?: number | string;
  enviado_a?: string;
  destinatarios?: string;
  asunto?: string;
  fecha_revision?: string;
  [key: string]: unknown;
};

type GeneratePdfPayload = {
  html?: string;
  filename?: string;
  metadata?: ReportMetadata;
  kpis?: unknown;
  kpi_cumplimiento_cronograma?: number | string;
  kpi_tasa_defectos?: number | string;
  kpi_productividad_equipo?: number | string;
  kpi_cumplimiento_requerimientos?: number | string;
  kpi_eficiencia_flujo?: number | string;
};

type InlineSegment = {
  text: string;
  href?: string;
};

type ReportBlock =
  | { type: "heading"; level: 1 | 2 | 3; segments: InlineSegment[] }
  | { type: "paragraph"; segments: InlineSegment[] }
  | { type: "list"; ordered: boolean; items: InlineSegment[][] }
  | { type: "table"; rows: InlineSegment[][][] }
  | { type: "kpi-section" }
  | { type: "divider" };

type PdfKpiField =
  | "kpi_cumplimiento_cronograma"
  | "kpi_tasa_defectos"
  | "kpi_productividad_equipo"
  | "kpi_cumplimiento_requerimientos"
  | "kpi_eficiencia_flujo";

type PdfKpiItem = {
  field: PdfKpiField;
  nombre: string;
  valor: string;
  formula?: string;
  calculo?: string;
  interpretacion?: string;
};

const KPI_DEFINITIONS: Array<{
  field: PdfKpiField;
  label: string;
  aliases: string[];
}> = [
  {
    field: "kpi_cumplimiento_cronograma",
    label: "Cumplimiento del cronograma",
    aliases: ["cumplimiento_cronograma", "kpi_cumplimiento_cronograma", "cumplimientoCronograma"],
  },
  {
    field: "kpi_tasa_defectos",
    label: "Tasa de defectos",
    aliases: ["tasa_defectos", "kpi_tasa_defectos", "tasaDefectos"],
  },
  {
    field: "kpi_productividad_equipo",
    label: "Productividad del equipo",
    aliases: ["productividad_equipo", "kpi_productividad_equipo", "productividadEquipo"],
  },
  {
    field: "kpi_cumplimiento_requerimientos",
    label: "Cumplimiento de requerimientos",
    aliases: [
      "cumplimiento_requerimientos",
      "kpi_cumplimiento_requerimientos",
      "cumplimientoRequerimientos",
    ],
  },
  {
    field: "kpi_eficiencia_flujo",
    label: "Eficiencia del flujo",
    aliases: ["eficiencia_flujo", "kpi_eficiencia_flujo", "eficienciaFlujo"],
  },
];

const DEFAULT_FILENAME = "reporte-seguimiento-sicop.pdf";
const STORAGE_BUCKET = "reportes-pdf";
const REPORT_RECORD_TITLE = "Reporte automático de seguimiento SICOP";
const TOTAL_TAREAS_ANALIZADAS = 22;
const REPORT_TITLE = "Reporte Automático - Proyecto SICOP";
const REPORT_SUBTITLE = "Agente autónomo de seguimiento del tablero Trello";
const REPORT_FOOTER = "Reporte generado automáticamente por el agente autónomo SICOP.";
const ECUADOR_TIME_ZONE = "America/Guayaquil";
const LOGO_PUBLIC_PATH = path.join(process.cwd(), "public", "aledcore-logo.png");
const PRIMARY_BLUE = "#0f2a44";
const SECONDARY_BLUE = "#143d63";
const ACCENT_BLUE = "#1d4f7a";

let logoDataUriPromise: Promise<string | null> | null = null;

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingRight: 40,
    paddingBottom: 62,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 22,
    paddingTop: 18,
    paddingRight: 24,
    paddingBottom: 18,
    paddingLeft: 24,
    borderRadius: 10,
    backgroundColor: PRIMARY_BLUE,
  },
  headerLogoBox: {
    width: 92,
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  headerLogo: {
    width: 78,
    height: 48,
    objectFit: "contain",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    margin: 0,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#ffffff",
  },
  dateBox: {
    marginBottom: 22,
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    borderLeftWidth: 5,
    borderLeftColor: ACCENT_BLUE,
    borderRadius: 8,
    backgroundColor: "#eaf2f8",
  },
  dateText: {
    fontSize: 13,
    color: "#1f2937",
  },
  kpiSection: {
    marginBottom: 24,
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "#f8fafc",
  },
  kpiSectionTitle: {
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT_BLUE,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY_BLUE,
  },
  kpiSectionDescription: {
    marginBottom: 14,
    fontSize: 11,
    lineHeight: 1.45,
    color: "#475569",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48%",
    minHeight: 78,
    paddingTop: 12,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "#ffffff",
  },
  kpiName: {
    marginBottom: 8,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY_BLUE,
  },
  kpiValue: {
    marginBottom: 6,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0284c7",
  },
  kpiDetailLine: {
    marginTop: 3,
    fontSize: 8.5,
    lineHeight: 1.45,
    color: "#475569",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  h1: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  h2: {
    marginTop: 26,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT_BLUE,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  h3: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 12,
  },
  list: {
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 5,
  },
  listBullet: {
    width: 22,
    fontSize: 12,
  },
  listText: {
    flex: 1,
    fontSize: 12,
  },
  table: {
    display: "flex",
    width: "100%",
    marginTop: 12,
    marginBottom: 20,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    fontSize: 11,
    lineHeight: 1.35,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    lineHeight: 1.35,
    color: "#111827",
    backgroundColor: "#eef3f8",
  },
  link: {
    color: SECONDARY_BLUE,
    textDecoration: "underline",
    fontFamily: "Helvetica-Bold",
  },
  divider: {
    height: 1,
    marginTop: 12,
    marginBottom: 18,
    backgroundColor: "#d1d5db",
  },
  footer: {
    position: "absolute",
    right: 42,
    bottom: 30,
    left: 42,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
});

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GeneratePdfPayload;
    const html = typeof payload.html === "string" ? payload.html.trim() : "";

    if (!html) {
      return NextResponse.json(
        { error: "El HTML del reporte es obligatorio" },
        { status: 400 },
      );
    }

    const metadata = normalizePayloadMetadata(payload);
    const filename = sanitizeFilename(payload.filename);
    const fechaRevision = resolveFechaRevision(metadata);
    const kpiItems = buildPdfKpiItems(metadata);
    const blocks = ensureKpiMarker(parseHtmlToReportBlocks(html), kpiItems);
    const pdfBuffer = await renderReportPdf(blocks, fechaRevision, kpiItems);

    await persistGeneratedReport({
      title: REPORT_RECORD_TITLE,
      html,
      filename,
      fechaRevision,
      metadata,
      pdfBuffer,
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("Error al generar el PDF de seguimiento:", error);

    return NextResponse.json(
      { error: "Error interno al generar el PDF del reporte" },
      { status: 500 },
    );
  }
}

function parseHtmlToReportBlocks(html: string): ReportBlock[] {
  const root = parse(html);
  const container = root.querySelector("body") ?? root;

  container
    .querySelectorAll("script, style, noscript, .pdf-header, .fecha-box, .footer")
    .forEach((node) => node.remove());

  const blocks: ReportBlock[] = [];
  container.childNodes.forEach((node) => appendNodeBlocks(node, blocks));

  if (blocks.length === 0) {
    const segments = extractInlineSegments(container);
    if (segments.length > 0) blocks.push({ type: "paragraph", segments });
  }

  return blocks;
}

function appendNodeBlocks(node: HtmlNode, blocks: ReportBlock[]) {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = normalizeText(node.text);
    if (text) blocks.push({ type: "paragraph", segments: [{ text }] });
    return;
  }

  if (!(node instanceof HTMLElement)) return;

  const tagName = node.tagName.toLowerCase();

  if (isStandaloneKpiSection(node)) {
    pushKpiMarker(blocks);
    return;
  }

  if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
    if (tagName === "h1" && isDuplicatedBackendHeader(node.text)) return;
    if (isKpiSectionTitle(node.text)) {
      pushKpiMarker(blocks);
      return;
    }

    const segments = extractInlineSegments(node);
    if (segments.length > 0) {
      blocks.push({
        type: "heading",
        level: Number(tagName.substring(1)) as 1 | 2 | 3,
        segments,
      });
    }
    return;
  }

  if (tagName === "h4" || tagName === "h5" || tagName === "h6") {
    const segments = extractInlineSegments(node);
    if (segments.length > 0) blocks.push({ type: "heading", level: 3, segments });
    return;
  }

  if (tagName === "p" || tagName === "blockquote" || tagName === "pre") {
    if (isDateReviewLine(node.text)) return;

    const segments = extractInlineSegments(node);
    if (segments.length > 0) blocks.push({ type: "paragraph", segments });
    return;
  }

  if (tagName === "ul" || tagName === "ol") {
    const items = node
      .querySelectorAll("li")
      .map((item) => extractInlineSegments(item))
      .filter((item) => item.length > 0);

    if (items.length > 0) {
      blocks.push({ type: "list", ordered: tagName === "ol", items });
    }
    return;
  }

  if (tagName === "table") {
    const rows = node
      .querySelectorAll("tr")
      .map((row) =>
        row
          .querySelectorAll("th, td")
          .map((cell) => extractInlineSegments(cell))
          .filter((cell) => cell.length > 0),
      )
      .filter((row) => row.length > 0);

    if (rows.length > 0) blocks.push({ type: "table", rows });
    return;
  }

  if (tagName === "hr") {
    blocks.push({ type: "divider" });
    return;
  }

  const blockCountBeforeChildren = blocks.length;
  node.childNodes.forEach((child) => appendNodeBlocks(child, blocks));

  if (blocks.length === blockCountBeforeChildren) {
    const segments = extractInlineSegments(node);
    if (segments.length > 0) blocks.push({ type: "paragraph", segments });
  }
}

function extractInlineSegments(node: HtmlNode): InlineSegment[] {
  return normalizeInlineSegments(collectInlineSegments(node));
}

function collectInlineSegments(node: HtmlNode): InlineSegment[] {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return [{ text: node.text }];
  }

  if (!(node instanceof HTMLElement)) return [];

  const tagName = node.tagName.toLowerCase();
  if (tagName === "br") return [{ text: "\n" }];

  if (tagName === "a") {
    const href = node.attributes.href?.trim();
    const text = normalizeText(node.text);

    if (!text) return [];
    return href ? [{ text, href }] : [{ text }];
  }

  return node.childNodes.flatMap((child) => collectInlineSegments(child));
}

function normalizeInlineSegments(segments: InlineSegment[]): InlineSegment[] {
  const normalizedSegments: InlineSegment[] = [];
  let pendingSpace = false;

  for (const segment of segments) {
    const compactText = segment.text.replace(/\s+/g, " ");
    const trimmedText = compactText.trim();

    if (!trimmedText) {
      pendingSpace = normalizedSegments.length > 0;
      continue;
    }

    const previousSegment = normalizedSegments.at(-1);
    const needsSpace =
      pendingSpace &&
      previousSegment !== undefined &&
      !previousSegment.text.endsWith(" ") &&
      !trimmedText.startsWith(".");
    const text = `${needsSpace ? " " : ""}${trimmedText}`;

    if (previousSegment !== undefined && previousSegment.href === segment.href) {
      previousSegment.text += text;
    } else {
      normalizedSegments.push(segment.href ? { text, href: segment.href } : { text });
    }

    pendingSpace = compactText.endsWith(" ");
  }

  return normalizedSegments;
}

function getLogoDataUri(): Promise<string | null> {
  logoDataUriPromise ??= readFile(LOGO_PUBLIC_PATH)
    .then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`)
    .catch((error) => {
      console.error("No se pudo cargar el logo del encabezado PDF:", error);
      return null;
    });

  return logoDataUriPromise;
}

async function renderReportPdf(
  blocks: ReportBlock[],
  fechaRevision: string,
  kpiItems: PdfKpiItem[],
): Promise<ArrayBuffer> {
  const logoDataUri = await getLogoDataUri();
  const document = ReportPdfDocument({ blocks, fechaRevision, logoDataUri, kpiItems });

  return pdf(document)
    .toBlob()
    .then((blob) => blob.arrayBuffer());
}

function ReportPdfDocument({
  blocks,
  fechaRevision,
  logoDataUri,
  kpiItems,
}: {
  blocks: ReportBlock[];
  fechaRevision: string;
  logoDataUri: string | null;
  kpiItems: PdfKpiItem[];
}): ReactElement<React.ComponentProps<typeof Document>> {
  return React.createElement(
    Document,
    {
      title: REPORT_TITLE,
      author: "SICOP",
      subject: "Reporte automatico de seguimiento",
      creator: "SICOP",
      producer: "SICOP",
    },
    React.createElement(
      Page,
      { size: "A4", style: styles.page, wrap: true },
      React.createElement(
        View,
        { style: styles.header },
        logoDataUri
          ? React.createElement(
              View,
              { style: styles.headerLogoBox },
              React.createElement(Image, {
                src: logoDataUri,
                style: styles.headerLogo,
              }),
            )
          : null,
        React.createElement(
          View,
          { style: styles.headerCopy },
          React.createElement(Text, { style: styles.headerTitle }, REPORT_TITLE),
          React.createElement(Text, { style: styles.headerSubtitle }, REPORT_SUBTITLE),
        ),
      ),
      React.createElement(
        View,
        { style: styles.dateBox },
        React.createElement(
          Text,
          { style: styles.dateText },
          React.createElement(Text, { style: styles.bold }, "Fecha de revisión: "),
          fechaRevision,
        ),
      ),
      ...blocks.map((block, index) => renderBlock(block, index, kpiItems)),
      React.createElement(Text, {
        fixed: true,
        render: ({ pageNumber, totalPages }) =>
          `${REPORT_FOOTER} Pagina ${pageNumber} de ${totalPages}`,
        style: styles.footer,
      }),
    ),
  );
}

function renderBlock(block: ReportBlock, index: number, kpiItems: PdfKpiItem[]): ReactElement {
  if (block.type === "kpi-section") {
    if (kpiItems.length === 0) {
      return React.createElement(View, { key: `kpi-section-empty-${index}` });
    }

    return renderPdfKpiSection(kpiItems, index);
  }

  if (block.type === "heading") {
    const style = block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
    return React.createElement(
      Text,
      { key: `heading-${index}`, style },
      ...renderInlineSegments(block.segments, `heading-${index}`),
    );
  }

  if (block.type === "paragraph") {
    return React.createElement(
      Text,
      { key: `paragraph-${index}`, style: styles.paragraph },
      ...renderInlineSegments(block.segments, `paragraph-${index}`),
    );
  }

  if (block.type === "list") {
    return React.createElement(
      View,
      { key: `list-${index}`, style: styles.list },
      ...block.items.map((item, itemIndex) =>
        React.createElement(
          View,
          { key: `list-${index}-${itemIndex}`, style: styles.listItem, wrap: false },
          React.createElement(
            Text,
            { style: styles.listBullet },
            block.ordered ? `${itemIndex + 1}.` : "-",
          ),
          React.createElement(
            Text,
            { style: styles.listText },
            ...renderInlineSegments(item, `list-${index}-${itemIndex}`),
          ),
        ),
      ),
    );
  }

  if (block.type === "table") {
    return React.createElement(
      View,
      { key: `table-${index}`, style: styles.table },
      ...block.rows.map((row, rowIndex) =>
        React.createElement(
          View,
          { key: `table-${index}-${rowIndex}`, style: styles.tableRow, wrap: false },
          ...row.map((cell, cellIndex) =>
            React.createElement(
              Text,
              {
                key: `table-${index}-${rowIndex}-${cellIndex}`,
                style: rowIndex === 0 ? styles.tableHeaderCell : styles.tableCell,
              },
              ...renderInlineSegments(cell, `table-${index}-${rowIndex}-${cellIndex}`),
            ),
          ),
        ),
      ),
    );
  }

  return React.createElement(View, { key: `divider-${index}`, style: styles.divider });
}

function renderPdfKpiSection(kpiItems: PdfKpiItem[], index: number): ReactElement {
  return React.createElement(
    View,
    { key: `kpi-section-${index}`, style: styles.kpiSection },
    React.createElement(
      Text,
      { style: styles.kpiSectionTitle },
      "Indicadores Clave de Desempeño (KPI)",
    ),
    React.createElement(
      Text,
      { style: styles.kpiSectionDescription },
      "Indicadores calculados dinámicamente con base en el estado actual del tablero Trello y los datos de seguimiento del proyecto.",
    ),
    React.createElement(
      View,
      { style: styles.kpiGrid },
      ...kpiItems.map((item) =>
        React.createElement(
          View,
          { key: item.field, style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiName }, item.nombre),
          React.createElement(Text, { style: styles.kpiValue }, item.valor),
          ...renderPdfKpiDetailLines(item),
        ),
      ),
    ),
  );
}

function renderPdfKpiDetailLines(item: PdfKpiItem): ReactElement[] {
  const rows: Array<{ label: string; text: string | undefined }> = [
    { label: "Fórmula: ", text: item.formula },
    { label: "Cálculo: ", text: item.calculo },
    { label: "Interpretación: ", text: item.interpretacion },
  ];

  return rows
    .filter(() => false)
    .map((row, index) =>
      React.createElement(
        Text,
        { key: `${item.field}-detail-${index}`, style: styles.kpiDetailLine },
        React.createElement(Text, { style: styles.bold }, row.label),
        row.text!.trim(),
      ),
    );
}

function renderInlineSegments(segments: InlineSegment[], keyPrefix: string): ReactElement[] {
  return segments.map((segment, index) => {
    if (segment.href) {
      return React.createElement(
        Link,
        {
          key: `${keyPrefix}-link-${index}`,
          src: segment.href,
          style: styles.link,
        },
        segment.text,
      );
    }

    return React.createElement(
      Text,
      { key: `${keyPrefix}-text-${index}` },
      segment.text,
    );
  });
}

function resolveFechaRevision(metadata?: ReportMetadata): string {
  const metadataDate = normalizeText(metadata?.fecha_revision ?? "");
  if (metadataDate) return metadataDate;

  return new Date().toLocaleDateString("es-EC", {
    timeZone: ECUADOR_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isDuplicatedBackendHeader(value: string): boolean {
  const text = normalizeText(value).toLowerCase();
  return (
    text.includes("reporte automatico") ||
    text.includes("reporte automático") ||
    text.includes("proyecto sicop")
  );
}

function isKpiSectionTitle(value: string): boolean {
  const text = normalizeKpiKey(value);
  return (
    text.includes("indicadores_clave_de_desempeno") ||
    text.includes("kpi") ||
    text.includes("desempeno_kpi")
  );
}

function isStandaloneKpiSection(node: HTMLElement): boolean {
  const tagName = node.tagName.toLowerCase();
  if (tagName === "body" || tagName === "html") return false;

  const headings = node.querySelectorAll("h1, h2, h3");
  return headings.length === 1 && isKpiSectionTitle(headings[0]?.text ?? "");
}

function pushKpiMarker(blocks: ReportBlock[]) {
  if (blocks.some((block) => block.type === "kpi-section")) return;
  blocks.push({ type: "kpi-section" });
}

function ensureKpiMarker(blocks: ReportBlock[], kpiItems: PdfKpiItem[]): ReportBlock[] {
  if (kpiItems.length === 0 || blocks.some((block) => block.type === "kpi-section")) {
    return blocks;
  }

  const firstTableIndex = blocks.findIndex((block) => block.type === "table");
  if (firstTableIndex < 0) return [{ type: "kpi-section" }, ...blocks];

  return [
    ...blocks.slice(0, firstTableIndex + 1),
    { type: "kpi-section" },
    ...blocks.slice(firstTableIndex + 1),
  ];
}

function isDateReviewLine(value: string): boolean {
  const text = normalizeText(value).toLowerCase();
  return text.startsWith("fecha de revisión:") || text.startsWith("fecha de revision:");
}

function sanitizeFilename(filename?: string): string {
  const cleanFilename = normalizeText(filename ?? DEFAULT_FILENAME)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\r\n]/g, "")
    .trim();

  if (!cleanFilename) return DEFAULT_FILENAME;
  return cleanFilename.toLowerCase().endsWith(".pdf") ? cleanFilename : `${cleanFilename}.pdf`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePayloadMetadata(payload: GeneratePdfPayload): ReportMetadata | undefined {
  const metadata: ReportMetadata = { ...(payload.metadata ?? {}) };
  const topLevelKpiKeys: Array<keyof Pick<
    GeneratePdfPayload,
    | "kpi_cumplimiento_cronograma"
    | "kpi_tasa_defectos"
    | "kpi_productividad_equipo"
    | "kpi_cumplimiento_requerimientos"
    | "kpi_eficiencia_flujo"
  >> = [
    "kpi_cumplimiento_cronograma",
    "kpi_tasa_defectos",
    "kpi_productividad_equipo",
    "kpi_cumplimiento_requerimientos",
    "kpi_eficiencia_flujo",
  ];

  if (payload.kpis !== undefined) metadata.kpis = payload.kpis;

  for (const key of topLevelKpiKeys) {
    if (payload[key] !== undefined) {
      metadata[key] = payload[key];
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function buildPdfKpiItems(metadata?: ReportMetadata): PdfKpiItem[] {
  return KPI_DEFINITIONS.flatMap((definition) => {
    const source = findKpiSource(metadata?.kpis, definition.aliases);
    const rawValue = metadata?.[definition.field] ?? getKpiSourceValue(source);
    const valor = formatKpiValue(rawValue);
    const nombre = getTextFromKpiSource(source, ["nombre", "name", "label", "titulo"]) ?? definition.label;
    const formula = getTextFromKpiSource(source, ["formula", "fórmula", "formula_text"]);
    const calculo = getTextFromKpiSource(source, [
      "calculo",
      "cálculo",
      "calculation",
      "detalle",
      "explicacion",
      "explicación",
    ]);
    const interpretacion = getTextFromKpiSource(source, [
      "interpretacion",
      "interpretación",
      "interpretation",
      "comentario",
      "analisis",
      "análisis",
    ]);

    if (!valor && !source) return [];

    return [
      {
        field: definition.field,
        nombre,
        valor: valor ?? "N/D",
        ...(formula ? { formula } : {}),
        ...(calculo ? { calculo } : {}),
        ...(interpretacion ? { interpretacion } : {}),
      },
    ];
  });
}

function findKpiSource(kpis: unknown, aliases: string[]): Record<string, unknown> | null {
  if (!kpis) return null;
  const normalizedAliases = aliases.map(normalizeKpiKey);

  if (Array.isArray(kpis)) {
    return (
      kpis.find((item): item is Record<string, unknown> => {
        if (item == null || typeof item !== "object" || Array.isArray(item)) return false;
        const record = item as Record<string, unknown>;
        const candidate = getTextFromKpiSource(record, ["id", "key", "codigo", "nombre", "name", "label", "titulo"]);
        return candidate ? normalizedAliases.includes(normalizeKpiKey(candidate)) : false;
      }) ?? null
    );
  }

  if (typeof kpis !== "object") return null;

  for (const [key, value] of Object.entries(kpis as Record<string, unknown>)) {
    if (!normalizedAliases.includes(normalizeKpiKey(key))) continue;
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return { valor: value };
  }

  return null;
}

function getKpiSourceValue(source: Record<string, unknown> | null): unknown {
  if (!source) return null;

  for (const key of ["resultado", "valor", "value", "porcentaje", "percentage", "resultado_porcentaje"]) {
    if (source[key] !== undefined) return source[key];
  }

  return null;
}

function getTextFromKpiSource(source: Record<string, unknown> | null, keys: string[]): string | null {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}

function formatKpiValue(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    if (text.includes("%")) return text;
    const numericValue = Number(text.replace(",", "."));
    if (Number.isFinite(numericValue)) return formatKpiNumber(numericValue);
    return text;
  }

  if (typeof value === "number" && Number.isFinite(value)) return formatKpiNumber(value);
  return null;
}

function formatKpiNumber(value: number): string {
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(percentValue) ? 0 : 1,
  }).format(percentValue)}%`;
}

function normalizeKpiKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/^kpi_/, "")
    .replace(/^_+|_+$/g, "");
}

async function persistGeneratedReport({
  title,
  html,
  filename,
  fechaRevision,
  metadata,
  pdfBuffer,
}: {
  title: string;
  html: string;
  filename: string;
  fechaRevision: string;
  metadata?: ReportMetadata;
  pdfBuffer: ArrayBuffer;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "No se subio ni registro el reporte en Supabase: falta NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. La service role key es necesaria en backend para subir archivos e insertar sin bloqueos de RLS.",
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const now = new Date();
  const storagePath = buildStoragePath();
  let archivoUrl: string | null = null;
  let archivoPath: string | null = null;
  let errorMensaje: string | null = null;

  try {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      errorMensaje = `Error al subir PDF a Supabase Storage: ${uploadError.message}`;
      console.error(errorMensaje, uploadError);
    } else {
      archivoPath = storagePath;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
      archivoUrl = data.publicUrl;
    }
  } catch (error) {
    errorMensaje = formatErrorMessage("Error inesperado al subir PDF a Supabase Storage", error);
    console.error(errorMensaje, error);
  }

  try {
    const destinatarios = getMetadataString(metadata, "destinatarios") ?? getMetadataString(metadata, "enviado_a");

    const { error } = await supabase.from("reportes_seguimiento").insert({
      titulo: title,
      tipo_reporte: "seguimiento_autonomo",
      fecha_revision: toSupabaseRevisionDate(fechaRevision),
      total_tareas: getMetadataNumber(metadata, "total_tareas", TOTAL_TAREAS_ANALIZADAS),
      tareas_completadas: getMetadataNumber(metadata, "tareas_completadas"),
      tareas_proximas: getMetadataNumber(metadata, "tareas_proximas"),
      tareas_atrasadas: getMetadataNumber(metadata, "tareas_atrasadas"),
      tareas_sin_fecha: getMetadataNumber(metadata, "tareas_sin_fecha"),
      tareas_en_plazo: getMetadataNumber(metadata, "tareas_en_plazo"),
      kpis: getMetadataKpis(metadata),
      kpi_cumplimiento_cronograma: getMetadataOptionalNumber(metadata, "kpi_cumplimiento_cronograma"),
      kpi_tasa_defectos: getMetadataOptionalNumber(metadata, "kpi_tasa_defectos"),
      kpi_productividad_equipo: getMetadataOptionalNumber(metadata, "kpi_productividad_equipo"),
      kpi_cumplimiento_requerimientos: getMetadataOptionalNumber(metadata, "kpi_cumplimiento_requerimientos"),
      kpi_eficiencia_flujo: getMetadataOptionalNumber(metadata, "kpi_eficiencia_flujo"),
      html_reporte: html,
      mensaje_html: html,
      archivo_nombre: filename,
      archivo_url: archivoUrl,
      archivo_path: archivoPath,
      enviado_a: destinatarios,
      destinatarios,
      asunto: getMetadataString(metadata, "asunto"),
      metadata: metadata ?? {},
      estado: "generado",
      enviado_en: now.toISOString(),
      error_mensaje: errorMensaje,
    });

    if (error) {
      console.error("No se pudo guardar el reporte de seguimiento en Supabase:", error);
    }
  } catch (error) {
    console.error("Error inesperado al guardar el reporte en Supabase:", error);
  }
}

function buildStoragePath(): string {
  return `reportes/reporte-seguimiento-sicop-${Date.now()}.pdf`;
}

function getMetadataNumber(
  metadata: ReportMetadata | undefined,
  key: keyof ReportMetadata,
  fallback = 0,
): number {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return fallback;
}

function getMetadataOptionalNumber(metadata: ReportMetadata | undefined, key: keyof ReportMetadata): number | null {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return null;
}

function getMetadataString(metadata: ReportMetadata | undefined, key: keyof ReportMetadata): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") return null;

  const text = normalizeText(value);
  return text ? text : null;
}

function getMetadataKpis(metadata: ReportMetadata | undefined): unknown {
  return metadata?.kpis ?? null;
}

function formatErrorMessage(prefix: string, error: unknown): string {
  if (error instanceof Error) return `${prefix}: ${error.message}`;
  return prefix;
}

function toSupabaseRevisionDate(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return value;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00-05:00`;
}
