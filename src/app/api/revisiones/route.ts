import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { SupabaseRevisionRepository } from "@/src/repositories/revision.repository";
import { revisionPayloadSchema } from "@/src/services/revision.schema";
import { RevisionService } from "@/src/services/revision.service";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import type { RevisionPayload } from "@/src/types/revision";

export async function POST(request: Request) {
  try {
    const rawPayload: unknown = await request.json();
    const validatedPayload = revisionPayloadSchema.parse(rawPayload);
    const payload: RevisionPayload =
      validatedPayload.tipo_revision === "documental"
        ? {
            ...validatedPayload,
            analisis_codigo: null,
          }
        : validatedPayload;

    const supabase = getSupabaseClient();
    const revisionRepository = new SupabaseRevisionRepository(supabase);
    const revisionService = new RevisionService(revisionRepository);

    await revisionService.procesarRevision(payload);

    return NextResponse.json(
      {
        ok: true,
        message: "Revision guardada correctamente",
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Payload invalido",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Error interno al procesar revision",
        detail: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV !== "production" && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
