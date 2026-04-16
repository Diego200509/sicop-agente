"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/utils";
import type { ChatMessage } from "@/src/types/chat";

type ChatPanelProps = {
  tareaId?: string | null;
  title?: string;
  className?: string;
};

export function ChatPanel({ tareaId = null, title = "Asistente SICOP", className }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (tareaId) params.set("tareaId", tareaId);
      const res = await fetch(`/api/chat?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el historial");
      const json = (await res.json()) as { data: ChatMessage[] };
      setMessages(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial");
    } finally {
      setLoadingHistory(false);
    }
  }, [tareaId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingHistory]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, tareaId: tareaId ?? null }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo enviar el mensaje");
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("flex max-h-[min(70vh,640px)] flex-col gap-3 overflow-hidden p-4", className)}>
      <div className="shrink-0">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Pregunta sobre tareas y revisiones. El contexto enviado al modelo es acotado.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        {loadingHistory && <p className="text-sm text-zinc-500">Cargando historial...</p>}

        {!loadingHistory && messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Aun no hay mensajes. Escribe una pregunta para comenzar.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex w-full",
              m.rol === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[min(100%,42rem)] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                m.rol === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(m.created_at).toLocaleString("es-ES")}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
              Pensando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={loading || loadingHistory}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="min-h-[88px] flex-1"
        />
        <Button type="button" className="shrink-0 sm:self-stretch" disabled={loading || loadingHistory} onClick={() => void send()}>
          Enviar
        </Button>
      </div>
    </Card>
  );
}
