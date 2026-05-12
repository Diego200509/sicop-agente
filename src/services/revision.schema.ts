import { z } from "zod";

const baseSchema = z.object({
  tipo_revision: z.enum(["documental", "codigo"]),
  id_tarea: z.string().min(1, "id_tarea es obligatorio"),
  titulo: z.string().min(1, "titulo es obligatorio"),
  fase: z.string().min(1, "fase es obligatorio"),
  descripcion: z.string().min(1, "descripcion es obligatorio"),
  url_tarjeta: z.string().optional().nullable(),
  inicio: z.string().optional().nullable(),
  fin: z.string().optional().nullable(),
  completado: z.boolean().optional().nullable(),
  estado: z.enum(["Cumplida", "Pendiente"]).optional().nullable(),
  pr_number: z.string().optional().nullable(),
  pr_title: z.string().optional().nullable(),
  repo_owner: z.string().optional().nullable(),
  repo_name: z.string().optional().nullable(),
  codigo_pr: z.string().optional().nullable(),
});

const documentalSchema = baseSchema.extend({
  tipo_revision: z.literal("documental"),
  texto_pdf: z.string().min(1, "texto_pdf es obligatorio para revision documental"),
  analisis_documental: z
    .string()
    .min(1, "analisis_documental es obligatorio para revision documental"),
  analisis_codigo: z.null().optional(),
});

const codigoSchema = baseSchema.extend({
  tipo_revision: z.literal("codigo"),
  analisis_codigo: z.string().min(1, "analisis_codigo es obligatorio para revision de codigo"),
  texto_pdf: z.string().optional().nullable(),
  analisis_documental: z.string().optional().nullable(),
});

export const revisionPayloadSchema = z.discriminatedUnion("tipo_revision", [
  documentalSchema,
  codigoSchema,
]);

export type RevisionPayloadInput = z.infer<typeof revisionPayloadSchema>;
