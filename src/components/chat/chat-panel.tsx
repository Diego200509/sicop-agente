"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MessageSquare } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/utils";
import type { ChatMessage } from "@/src/types/chat";

function SendArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
    <Card
      className={cn(
        "flex min-h-0 flex-col gap-3 overflow-hidden p-4 sm:p-5",
        className,
      )}
    >
      <div className="shrink-0">
        <h3 className="text-base font-semibold leading-tight sm:text-lg">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Pregunta sobre tareas y revisiones. El contexto enviado al modelo es acotado.
        </p>
      </div>

      <div className="scrollbar-elegant min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        {loadingHistory && <p className="text-sm text-zinc-500">Cargando historial...</p>}

        {!loadingHistory && messages.length === 0 && (
          <EmptyState
            compact
            icon={MessageSquare}
            title="Aún no hay mensajes"
            description="Escribe una pregunta en el campo de abajo para comenzar a conversar con el asistente."
          />
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
                "max-w-[min(100%,52rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
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
        <p className="shrink-0 text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex shrink-0 items-end gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-100/90 p-1.5 pl-2.5 dark:border-zinc-700 dark:bg-zinc-900/60">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={loading || loadingHistory}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className={cn(
            "!min-h-[40px] !max-h-[120px] !resize-none flex-1 overflow-y-auto scrollbar-elegant border-0 bg-transparent py-2.5 pl-0 text-sm leading-snug",
            "shadow-none outline-none ring-0 placeholder:text-zinc-500 dark:bg-transparent",
            "!focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
        />
        <Button
          type="button"
          disabled={loading || loadingHistory || !input.trim()}
          onClick={() => void send()}
          aria-label="Enviar mensaje"
          className="size-9 shrink-0 rounded-xl p-0 sm:size-9"
        >
          <SendArrowIcon className="size-5" />
        </Button>
      </div>
    </Card>
  );
}
