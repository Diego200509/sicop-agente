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
    const mergeKey = buildMergeKeyPreferTech(payload.titulo, payload.fase, payload.descripcion);

    const tarea = await this.revisionRepository.upsertTarea({
      id_tarea: payload.id_tarea,
      titulo: payload.titulo,
      fase: payload.fase,
      descripcion: payload.descripcion,
      url_tarjeta: payload.url_tarjeta ?? null,
      mergeKey,
    });

    const revisionInput = mapPayloadToRevisionInput(payload, tarea.id);
    await this.revisionRepository.createRevision(revisionInput);
  }
}
