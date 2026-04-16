import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSupabaseClient } from "@/src/lib/supabase/client";
import { ChatRepository } from "@/src/repositories/chat.repository";
import { RevisionesRepository } from "@/src/repositories/revisiones.repository";
import { TareasRepository } from "@/src/repositories/tareas.repository";
import { chatPostBodySchema } from "@/src/services/chat.schema";
import { ChatService } from "@/src/services/chat.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tareaId = searchParams.get("tareaId");
    const limitRaw = searchParams.get("limit");
    const limit = Math.min(50, Math.max(1, Number(limitRaw ?? "20") || 20));

    const repo = new ChatRepository(getSupabaseClient());
    const tareaUuid = tareaId && tareaId.length > 0 ? tareaId : null;
    const messages = await repo.getMessagesForUi(tareaUuid, limit);

    return NextResponse.json({ data: messages }, { status: 200 });
  } catch (error) {
    console.error("GET /api/chat:", error);
    return NextResponse.json({ error: "No se pudo cargar el historial" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = chatPostBodySchema.parse(body);
    const tareaUuid = parsed.tareaId ?? null;

    const supabase = getSupabaseClient();
    const chatRepo = new ChatRepository(supabase);
    const tareasRepo = new TareasRepository(supabase);
    const revRepo = new RevisionesRepository(supabase);
    const chatService = new ChatService(chatRepo, tareasRepo, revRepo);

    if (tareaUuid) {
      const exists = await tareasRepo.getByUuid(tareaUuid);
      if (!exists) {
        return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
      }
    }

    const result = await chatService.sendMessage(parsed.message, tareaUuid);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("POST /api/chat:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalido", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en el chat" },
      { status: 500 },
    );
  }
}
