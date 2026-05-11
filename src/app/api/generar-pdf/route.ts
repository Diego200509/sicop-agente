import React, { type ReactElement } from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { HTMLElement, NodeType, parse, type Node as HtmlNode } from "node-html-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportMetadata = {
  total_tareas?: number;
  tareas_proximas?: number;
  tareas_atrasadas?: number;
  tareas_sin_fecha?: number;
  tareas_en_plazo?: number;
  enviado_a?: string;
};

type GeneratePdfPayload = {
  html?: string;
  filename?: string;
  metadata?: ReportMetadata;
};

type ReportBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "divider" };

const DEFAULT_FILENAME = "reporte-seguimiento-sicop.pdf";
const DEFAULT_TITLE = "Reporte de seguimiento SICOP";

const styles = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingRight: 42,
    paddingBottom: 54,
    paddingLeft: 42,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
    color: "#1f2937",
  },
  h1: {
    marginBottom: 12,
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  h2: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  h3: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  paragraph: {
    marginBottom: 8,
  },
  list: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listBullet: {
    width: 22,
  },
  listText: {
    flex: 1,
  },
  table: {
    display: "flex",
    width: "auto",
    marginTop: 6,
    marginBottom: 12,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f4f6",
  },
  divider: {
    height: 1,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#d1d5db",
  },
  footer: {
    position: "absolute",
    right: 42,
    bottom: 28,
    left: 42,
    fontSize: 9,
    color: "#6b7280",
    textAlign: "right",
  },
});

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GeneratePdfPayload;
    const html = typeof payload.html === "string" ? payload.html.trim() : "";

    if (!html) {
      return NextResponse.json(
        { error: "El contenido HTML del reporte es obligatorio" },
        { status: 400 },
      );
    }

    const filename = sanitizeFilename(payload.filename);
    const blocks = parseHtmlToReportBlocks(html);
    const title = extractReportTitle(blocks, filename);
    const pdfBuffer = await renderReportPdf(blocks, title);

    await saveReportRecord({
      title,
      html,
      filename,
      metadata: payload.metadata,
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

  container.querySelectorAll("script, style, noscript").forEach((node) => node.remove());

  const blocks: ReportBlock[] = [];
  container.childNodes.forEach((node) => appendNodeBlocks(node, blocks));

  if (blocks.length === 0) {
    const text = normalizeText(container.text);
    if (text) blocks.push({ type: "paragraph", text });
  }

  return blocks;
}

function appendNodeBlocks(node: HtmlNode, blocks: ReportBlock[]) {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = normalizeText(node.text);
    if (text) blocks.push({ type: "paragraph", text });
    return;
  }

  if (!(node instanceof HTMLElement)) return;

  const tagName = node.tagName.toLowerCase();

  if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
    const text = normalizeText(node.text);
    if (text) {
      blocks.push({
        type: "heading",
        level: Number(tagName.substring(1)) as 1 | 2 | 3,
        text,
      });
    }
    return;
  }

  if (tagName === "h4" || tagName === "h5" || tagName === "h6") {
    const text = normalizeText(node.text);
    if (text) blocks.push({ type: "heading", level: 3, text });
    return;
  }

  if (tagName === "p" || tagName === "blockquote" || tagName === "pre") {
    const text = normalizeText(node.text);
    if (text) blocks.push({ type: "paragraph", text });
    return;
  }

  if (tagName === "ul" || tagName === "ol") {
    const items = node
      .querySelectorAll("li")
      .map((item) => normalizeText(item.text))
      .filter(Boolean);

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
          .map((cell) => normalizeText(cell.text))
          .filter(Boolean),
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
    const text = normalizeText(node.text);
    if (text) blocks.push({ type: "paragraph", text });
  }
}

function renderReportPdf(blocks: ReportBlock[], title: string): Promise<ArrayBuffer> {
  const document = React.createElement(ReportPdfDocument, { blocks, title });

  return pdf(document)
    .toBlob()
    .then((blob) => blob.arrayBuffer());
}

function ReportPdfDocument({
  blocks,
  title,
}: {
  blocks: ReportBlock[];
  title: string;
}): ReactElement {
  return React.createElement(
    Document,
    {
      title,
      author: "SICOP",
      subject: "Reporte automatico de seguimiento",
      creator: "SICOP",
      producer: "SICOP",
    },
    React.createElement(
      Page,
      { size: "A4", style: styles.page, wrap: true },
      ...blocks.map(renderBlock),
      React.createElement(Text, {
        fixed: true,
        render: ({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`,
        style: styles.footer,
      }),
    ),
  );
}

function renderBlock(block: ReportBlock, index: number): ReactElement {
  if (block.type === "heading") {
    const style = block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
    return React.createElement(Text, { key: `heading-${index}`, style }, block.text);
  }

  if (block.type === "paragraph") {
    return React.createElement(
      Text,
      { key: `paragraph-${index}`, style: styles.paragraph },
      block.text,
    );
  }

  if (block.type === "list") {
    return React.createElement(
      View,
      { key: `list-${index}`, style: styles.list },
      ...block.items.map((item, itemIndex) =>
        React.createElement(
          View,
          { key: `list-${index}-${itemIndex}`, style: styles.listItem },
          React.createElement(
            Text,
            { style: styles.listBullet },
            block.ordered ? `${itemIndex + 1}.` : "-",
          ),
          React.createElement(Text, { style: styles.listText }, item),
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
          { key: `table-${index}-${rowIndex}`, style: styles.tableRow },
          ...row.map((cell, cellIndex) =>
            React.createElement(
              Text,
              {
                key: `table-${index}-${rowIndex}-${cellIndex}`,
                style: rowIndex === 0 ? styles.tableHeaderCell : styles.tableCell,
              },
              cell,
            ),
          ),
        ),
      ),
    );
  }

  return React.createElement(View, { key: `divider-${index}`, style: styles.divider });
}

function extractReportTitle(blocks: ReportBlock[], filename: string): string {
  const heading = blocks.find(
    (block): block is Extract<ReportBlock, { type: "heading" }> => block.type === "heading",
  );

  if (heading?.text) return heading.text;

  const filenameTitle = filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return filenameTitle || DEFAULT_TITLE;
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

async function saveReportRecord({
  title,
  html,
  filename,
  metadata,
}: {
  title: string;
  html: string;
  filename: string;
  metadata?: ReportMetadata;
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "No se registro el reporte en Supabase: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.from("reportes_seguimiento").insert({
      titulo: title,
      tipo_reporte: "seguimiento",
      fecha_revision: new Date().toISOString(),
      total_tareas: metadata?.total_tareas ?? null,
      tareas_proximas: metadata?.tareas_proximas ?? null,
      tareas_atrasadas: metadata?.tareas_atrasadas ?? null,
      tareas_sin_fecha: metadata?.tareas_sin_fecha ?? null,
      tareas_en_plazo: metadata?.tareas_en_plazo ?? null,
      html_reporte: html,
      archivo_nombre: filename,
      enviado_a: metadata?.enviado_a ?? null,
      estado: "generado",
    });

    if (error) {
      console.error("No se pudo guardar el reporte de seguimiento en Supabase:", error);
    }
  } catch (error) {
    console.error("Error inesperado al guardar el reporte en Supabase:", error);
  }
}
