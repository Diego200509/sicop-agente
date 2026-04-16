import OpenAI from "openai";

import { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import { TareasRepository } from "@/src/repositories/tareas.repository";
import type { ConclusionResult, RevisionContext, TareaContext } from "@/src/types/chat";

function truncate(value: string | null | undefined, max: number): string {
  if (!value) return "";
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

const CONCLUSION_SYSTEM = `Eres analista del proyecto SICOP. Solo usas la informacion proporcionada (tarea y revisiones). No inventes datos.
Debes responder con un JSON valido (sin markdown) con exactamente estas claves:
{
  "nivel_cumplimiento": "Completo" | "Parcial" | "No cumple",
  "coincidencias": "texto",
  "diferencias": "texto",
  "riesgos_observaciones": "texto",
  "recomendacion_final": "texto"
}
Los textos deben ser claros y concisos en espanol.`;

export class ConclusionService {
  private openai: OpenAI;

  constructor(
    private readonly tareasRepo: TareasRepository,
    private readonly revisionesRepo: RevisionesRepository,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Falta OPENAI_API_KEY en variables de entorno");
    }
    this.openai = new OpenAI({ apiKey });
  }

  private model(): string {
    return process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  }

  async generateForTareaUuid(tareaUuid: string): Promise<ConclusionResult> {
    const tarea = await this.tareasRepo.getByUuid(tareaUuid);
    if (!tarea) {
      throw new Error("Tarea no encontrada");
    }

    const [doc, code] = await Promise.all([
      this.revisionesRepo.getLatestByType(tareaUuid, "documental"),
      this.revisionesRepo.getLatestByType(tareaUuid, "codigo"),
    ]);

    if (!doc || !code) {
      throw new Error("Se requiere revision documental y revision de codigo para generar la conclusion");
    }

    const payload = this.buildPayload(tarea, doc, code);

    const completion = await this.openai.chat.completions.create({
      model: this.model(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CONCLUSION_SYSTEM },
        {
          role: "user",
          content: `Datos para analizar:\n\n${payload}\n\nGenera el JSON de conclusion.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error("Respuesta vacia del modelo");

    let parsed: {
      nivel_cumplimiento?: string;
      coincidencias?: string;
      diferencias?: string;
      riesgos_observaciones?: string;
      recomendacion_final?: string;
    };

    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new Error("No se pudo interpretar la conclusion del modelo");
    }

    const nivel = parsed.nivel_cumplimiento;
    const nivelOk =
      nivel === "Completo" || nivel === "Parcial" || nivel === "No cumple" ? nivel : "Parcial";

    const textoCompleto = [
      `Nivel de cumplimiento: ${nivelOk}`,
      `Coincidencias: ${parsed.coincidencias ?? ""}`,
      `Diferencias: ${parsed.diferencias ?? ""}`,
      `Riesgos y observaciones: ${parsed.riesgos_observaciones ?? ""}`,
      `Recomendacion final: ${parsed.recomendacion_final ?? ""}`,
    ].join("\n\n");

    return {
      nivel_cumplimiento: nivelOk,
      coincidencias: parsed.coincidencias ?? "",
      diferencias: parsed.diferencias ?? "",
      riesgos_observaciones: parsed.riesgos_observaciones ?? "",
      recomendacion_final: parsed.recomendacion_final ?? "",
      texto_completo: textoCompleto,
    };
  }

  private buildPayload(tarea: TareaContext, doc: RevisionContext, code: RevisionContext): string {
    return [
      "## Tarea",
      `Titulo: ${tarea.titulo}`,
      `Fase: ${tarea.fase}`,
      `Descripcion: ${truncate(tarea.descripcion, 3000)}`,
      "",
      "## Revision documental (mas reciente)",
      `Analisis: ${truncate(doc.analisis_documental, 4000)}`,
      `Texto PDF (extracto): ${truncate(doc.texto_pdf, 2000)}`,
      "",
      "## Revision de codigo (mas reciente)",
      `Analisis: ${truncate(code.analisis_codigo, 4000)}`,
      `PR: ${code.pr_title ?? ""} | Repo: ${[code.repo_owner, code.repo_name].filter(Boolean).join("/")}`,
      `Codigo PR (extracto): ${truncate(code.codigo_pr, 2000)}`,
    ].join("\n");
  }
}
