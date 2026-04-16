export type TipoRevision = "documental" | "codigo";

interface RevisionPayloadBase {
  tipo_revision: TipoRevision;
  id_tarea: string;
  titulo: string;
  fase: string;
  descripcion: string;
  url_tarjeta?: string | null;
  pr_number?: string | null;
  pr_title?: string | null;
  repo_owner?: string | null;
  repo_name?: string | null;
  codigo_pr?: string | null;
}

export interface RevisionDocumentalPayload extends RevisionPayloadBase {
  tipo_revision: "documental";
  texto_pdf: string;
  analisis_documental: string;
  analisis_codigo?: null;
}

export interface RevisionCodigoPayload extends RevisionPayloadBase {
  tipo_revision: "codigo";
  analisis_codigo: string;
  texto_pdf?: string | null;
  analisis_documental?: string | null;
}

export type RevisionPayload = RevisionDocumentalPayload | RevisionCodigoPayload;
