import {
  mapPayloadToRevisionInput,
  type RevisionRepository,
} from "@/src/repositories/revision.repository";
import type { RevisionPayload } from "@/src/types/revision";

export class RevisionService {
  constructor(private readonly revisionRepository: RevisionRepository) {}

  async procesarRevision(payload: RevisionPayload): Promise<void> {
    const tareaExistente = await this.revisionRepository.findTareaByExternalId(payload.id_tarea);

    const tarea =
      tareaExistente ??
      (await this.revisionRepository.createTarea({
        id_tarea: payload.id_tarea,
        titulo: payload.titulo,
        fase: payload.fase,
        descripcion: payload.descripcion,
        url_tarjeta: payload.url_tarjeta ?? null,
      }));

    const revisionInput = mapPayloadToRevisionInput(payload, tarea.id);
    await this.revisionRepository.createRevision(revisionInput);
  }
}
