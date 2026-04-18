import { buildMergeKeyPreferTech } from "@/src/lib/tarea-match-key";
import {
  mapPayloadToRevisionInput,
  type RevisionRepository,
} from "@/src/repositories/revision.repository";
import type { RevisionPayload } from "@/src/types/revision";

/**
 * Una sola fila por tarea lógica: el repositorio hace upsert atómico por `merge_key` (RPC en BD).
 * id_tarea / url / título solo sirven como metadatos del último webhook, no como identidad estable.
 */
export class RevisionService {
  constructor(private readonly revisionRepository: RevisionRepository) {}

  async procesarRevision(payload: RevisionPayload): Promise<void> {
    const desc = payload.descripcion ?? "";
    console.log("[RevisionService] inicio procesamiento", {
      tipo_revision: payload.tipo_revision,
      id_tarea: payload.id_tarea,
      titulo: payload.titulo,
      fase: payload.fase,
      descripcion_len: desc.length,
      descripcion_preview: desc.length > 200 ? `${desc.slice(0, 200)}…` : desc,
      url_tarjeta: payload.url_tarjeta ?? null,
    });

    const mergeKey = buildMergeKeyPreferTech(payload.titulo, payload.fase, payload.descripcion);
    console.log("[RevisionService] merge_key calculado:", mergeKey);

    console.log("[RevisionService] upsert tarea (merge_key como identidad lógica)…");
    const tarea = await this.revisionRepository.upsertTarea({
      id_tarea: payload.id_tarea,
      titulo: payload.titulo,
      fase: payload.fase,
      descripcion: payload.descripcion,
      url_tarjeta: payload.url_tarjeta ?? null,
      mergeKey,
    });
    console.log("[RevisionService] tarea resuelta / reutilizada:", {
      id: tarea.id,
      id_tarea: tarea.id_tarea,
    });

    const revisionInput = mapPayloadToRevisionInput(payload, tarea.id);
    console.log("[RevisionService] creando revision en BD…");
    await this.revisionRepository.createRevision(revisionInput);
    console.log("[RevisionService] revision creada correctamente");
  }
}
