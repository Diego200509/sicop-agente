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
    console.info("[revisiones] tipo_revision recibida", payload.tipo_revision);
    console.info("[revisiones] id_tarea recibida", payload.id_tarea);

    const mergeKey = buildMergeKeyPreferTech(payload.titulo, payload.fase, payload.descripcion);

    if (payload.tipo_revision === "codigo") {
      await this.procesarRevisionCodigo(payload, mergeKey);
      return;
    }

    await this.procesarRevisionDocumental(payload, mergeKey);
  }

  private async procesarRevisionDocumental(
    payload: Extract<RevisionPayload, { tipo_revision: "documental" }>,
    mergeKey: string,
  ): Promise<void> {
    const estadoFromPayload =
      payload.estado ??
      (payload.completado == null ? undefined : payload.completado ? "Cumplida" : "Pendiente");

    const tarea = await this.revisionRepository.upsertTarea({
      id_tarea: payload.id_tarea,
      titulo: payload.titulo,
      fase: payload.fase,
      descripcion: payload.descripcion,
      url_tarjeta: payload.url_tarjeta ?? null,
      inicio: payload.inicio ?? null,
      fin: payload.fin ?? null,
      completado: payload.completado,
      estado: estadoFromPayload,
      mergeKey,
    });

    console.info("[revisiones] tarea actualizada desde flujo documental", {
      tarea_id: tarea.id,
      id_tarea: tarea.id_tarea,
      inicio: tarea.inicio,
      fin: tarea.fin,
      estado: tarea.estado,
      completado: tarea.completado,
    });

    const revisionInput = mapPayloadToRevisionInput(payload, tarea.id);
    const revisionId = await this.revisionRepository.createRevision(revisionInput);
    console.info("[revisiones] revision creada", {
      revision_id: revisionId,
      tipo_revision: payload.tipo_revision,
      tarea_id: tarea.id,
    });
  }

  private async procesarRevisionCodigo(
    payload: Extract<RevisionPayload, { tipo_revision: "codigo" }>,
    mergeKey: string,
  ): Promise<void> {
    let tarea = await this.revisionRepository.findTareaByExternalId(payload.id_tarea.trim());
    let matchedBy: "id_tarea" | "merge_key" = "id_tarea";

    if (!tarea) {
      tarea = await this.revisionRepository.findTareaByMergeKey(mergeKey);
      matchedBy = "merge_key";
    }

    if (!tarea) {
      console.info("[revisiones] tarea no actualizada desde flujo codigo", {
        reason: "no se encontro tarea existente por id_tarea ni merge_key",
        id_tarea: payload.id_tarea,
        merge_key: mergeKey,
      });

      throw new Error(
        `Revision de codigo sin tarea existente: id_tarea=${payload.id_tarea}, merge_key=${mergeKey}`,
      );
    }

    console.info("[revisiones] tarea preservada desde flujo codigo", {
      tarea_id: tarea.id,
      id_tarea: tarea.id_tarea,
      matched_by: matchedBy,
      tarea_actualizada: false,
      inicio_preservado: tarea.inicio,
      fin_preservado: tarea.fin,
      estado_preservado: tarea.estado,
      completado_preservado: tarea.completado,
    });

    const revisionInput = mapPayloadToRevisionInput(payload, tarea.id);
    const revisionId = await this.revisionRepository.createRevision(revisionInput);
    console.info("[revisiones] revision creada", {
      revision_id: revisionId,
      tipo_revision: payload.tipo_revision,
      tarea_id: tarea.id,
    });
  }
}
