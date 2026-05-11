"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronUp, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { ChatAssistantPlaceholder } from "@/src/components/chat/chat-assistant-placeholder";
import { isLocalMessageId, toUiMessages, type UiChatMessage } from "@/src/components/chat/chat-types";
import { AnalysisMarkdown } from "@/src/components/documentos/analysis-markdown";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/utils";
import type { ChatMessage } from "@/src/types/chat";

const NEAR_BOTTOM_PX = 140;
const HISTORY_PAGE_SIZE = 20;

/** Una línea cómoda (text-sm + padding vertical del compositor). */
const CHAT_COMPOSER_MIN_HEIGHT_PX = 46;
/** ~5–6 líneas visibles antes de activar scroll interno. */
const CHAT_COMPOSER_MAX_HEIGHT_PX = 156;

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

function isNearBottom(el: HTMLDivElement | null, threshold = NEAR_BOTTOM_PX): boolean {
  if (!el) return true;
  const { scrollTop, scrollHeight, clientHeight } = el;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

function scrollElToBottom(el: HTMLDivElement | null, behavior: ScrollBehavior) {
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
}

type ChatPanelProps = {
  tareaId?: string | null;
  title?: string;
  className?: string;
};

function messageRowKey(m: UiChatMessage): string {
  if (m.correlationId) {
    return `${m.rol}-${m.correlationId}`;
  }
  return m.id;
}

function oldestServerMessage(messages: UiChatMessage[]): UiChatMessage | null {
  for (const m of messages) {
    if (!isLocalMessageId(m.id)) return m;
  }
  return null;
}

function mergeOlderMessagesFirst(existing: UiChatMessage[], older: ChatMessage[]): UiChatMessage[] {
  const olderUi = toUiMessages(older);
  const ids = new Set(existing.map((m) => m.id));
  const uniqueOlder = olderUi.filter((m) => !ids.has(m.id));
  return [...uniqueOlder, ...existing];
}

export function ChatPanel({ tareaId = null, title = "Asistente SICOP", className }: ChatPanelProps) {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [inFlight, setInFlight] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderLoadError, setOlderLoadError] = useState<string | null>(null);
  const [hasEverRequestedOlder, setHasEverRequestedOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRestoreRef = useRef<{ prevScrollHeight: number; prevScrollTop: number } | null>(null);

  const syncComposerHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    const sh = el.scrollHeight;
    const next = Math.max(CHAT_COMPOSER_MIN_HEIGHT_PX, Math.min(sh, CHAT_COMPOSER_MAX_HEIGHT_PX));
    el.style.height = `${next}px`;
    el.style.overflowY = sh > CHAT_COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    syncComposerHeight();
  }, [input, loadingHistory, syncComposerHeight]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError(null);
    setOlderLoadError(null);
    setHasEverRequestedOlder(false);
    scrollRestoreRef.current = null;
    try {
      const params = new URLSearchParams();
      params.set("limit", String(HISTORY_PAGE_SIZE));
      if (tareaId) params.set("tareaId", tareaId);
      const res = await fetch(`/api/chat?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el historial");
      const json = (await res.json()) as { data: ChatMessage[]; hasMore?: boolean };
      const rows = json.data ?? [];
      setMessages(toUiMessages(rows));
      setHasMoreHistory(
        typeof json.hasMore === "boolean" ? json.hasMore : rows.length >= HISTORY_PAGE_SIZE,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial");
      setHasMoreHistory(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [tareaId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  /** Tras insertar mensajes antiguos arriba, conservar la posición visual del scroll. */
  useLayoutEffect(() => {
    const payload = scrollRestoreRef.current;
    if (!payload) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight - payload.prevScrollHeight + payload.prevScrollTop;
    }
    scrollRestoreRef.current = null;
  }, [messages]);

  /** Primera carga del historial: ir al final sin animación larga */
  useEffect(() => {
    if (loadingHistory) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => scrollElToBottom(el, "auto"));
  }, [loadingHistory, tareaId]);

  const focusInput = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
    requestAnimationFrame(() => syncComposerHeight());
  }, [syncComposerHeight]);

  const sendWithText = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || inFlight || loadingHistory) return;

      const correlationId = uuidv4();
      const now = new Date().toISOString();

      const userMsg: UiChatMessage = {
        id: `local-user-${correlationId}`,
        tarea_id: tareaId,
        rol: "user",
        mensaje: text,
        created_at: now,
        status: "optimistic",
        correlationId,
      };

      const assistantPlaceholder: UiChatMessage = {
        id: `local-assistant-${correlationId}`,
        tarea_id: tareaId,
        rol: "assistant",
        mensaje: "",
        created_at: now,
        status: "loading",
        correlationId,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput("");
      setInFlight(true);
      setError(null);

      requestAnimationFrame(() => {
        scrollElToBottom(scrollRef.current, "smooth");
      });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, tareaId: tareaId ?? null }),
        });
        const json = (await res.json()) as { data?: { reply: string; messageIdAssistant?: string }; error?: string };
        if (!res.ok) throw new Error(json.error ?? "No se pudo enviar el mensaje");

        const reply = json.data?.reply ?? "";
        const assistantId = json.data?.messageIdAssistant ?? `local-assistant-${correlationId}`;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.correlationId !== correlationId) return m;
            if (m.rol === "user") {
              return { ...m, status: "confirmed" as const };
            }
            if (m.rol === "assistant") {
              return {
                ...m,
                id: assistantId,
                mensaje: reply,
                status: "confirmed" as const,
                created_at: new Date().toISOString(),
              };
            }
            return m;
          }),
        );

        requestAnimationFrame(() => {
          if (isNearBottom(scrollRef.current)) {
            scrollElToBottom(scrollRef.current, "smooth");
          }
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al enviar";
        setMessages((prev) =>
          prev.map((m) =>
            m.correlationId === correlationId && m.rol === "assistant"
              ? {
                  ...m,
                  status: "error" as const,
                  mensaje: "",
                  errorDetail: msg,
                }
              : m,
          ),
        );
        setError(msg);
        requestAnimationFrame(() => {
          if (isNearBottom(scrollRef.current)) {
            scrollElToBottom(scrollRef.current, "smooth");
          }
        });
      } finally {
        setInFlight(false);
        focusInput();
      }
    },
    [inFlight, loadingHistory, tareaId, focusInput],
  );

  const retryPair = useCallback(
    async (correlationId: string) => {
      if (inFlight || loadingHistory) return;
      const user = messages.find((x) => x.correlationId === correlationId && x.rol === "user");
      const textToSend = user?.mensaje?.trim();
      if (!textToSend) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.correlationId === correlationId && m.rol === "assistant"
            ? { ...m, status: "loading" as const, errorDetail: undefined, mensaje: "" }
            : m,
        ),
      );
      setInFlight(true);
      setError(null);

      requestAnimationFrame(() => {
        scrollElToBottom(scrollRef.current, "smooth");
      });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: textToSend, tareaId: tareaId ?? null }),
        });
        const json = (await res.json()) as { data?: { reply: string; messageIdAssistant?: string }; error?: string };
        if (!res.ok) throw new Error(json.error ?? "No se pudo enviar el mensaje");

        const reply = json.data?.reply ?? "";
        const assistantId = json.data?.messageIdAssistant ?? `local-assistant-${correlationId}`;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.correlationId !== correlationId) return m;
            if (m.rol === "assistant") {
              return {
                ...m,
                id: assistantId,
                mensaje: reply,
                status: "confirmed" as const,
                created_at: new Date().toISOString(),
              };
            }
            return m;
          }),
        );

        requestAnimationFrame(() => {
          if (isNearBottom(scrollRef.current)) {
            scrollElToBottom(scrollRef.current, "smooth");
          }
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al enviar";
        setMessages((prev) =>
          prev.map((m) =>
            m.correlationId === correlationId && m.rol === "assistant"
              ? {
                  ...m,
                  status: "error" as const,
                  mensaje: "",
                  errorDetail: msg,
                }
              : m,
          ),
        );
        setError(msg);
        requestAnimationFrame(() => {
          if (isNearBottom(scrollRef.current)) {
            scrollElToBottom(scrollRef.current, "smooth");
          }
        });
      } finally {
        setInFlight(false);
        focusInput();
      }
    },
    [inFlight, loadingHistory, messages, tareaId, focusInput],
  );

  const send = useCallback(async () => {
    await sendWithText(input);
  }, [input, sendWithText]);

  const removeFailedPair = useCallback((correlationId: string) => {
    setMessages((prev) => prev.filter((m) => m.correlationId !== correlationId));
    setError(null);
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || loadingHistory || !hasMoreHistory) return;
    const anchor = oldestServerMessage(messages);
    const scrollEl = scrollRef.current;
    if (!anchor || !scrollEl) return;

    const prevScrollHeight = scrollEl.scrollHeight;
    const prevScrollTop = scrollEl.scrollTop;

    setOlderLoadError(null);
    setLoadingOlder(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(HISTORY_PAGE_SIZE));
      params.set("before", anchor.created_at);
      if (tareaId) params.set("tareaId", tareaId);
      const res = await fetch(`/api/chat?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar mensajes anteriores");
      const json = (await res.json()) as { data: ChatMessage[]; hasMore?: boolean };
      const batch = json.data ?? [];
      setMessages((prev) => mergeOlderMessagesFirst(prev, batch));
      setHasMoreHistory(
        typeof json.hasMore === "boolean" ? json.hasMore : batch.length >= HISTORY_PAGE_SIZE,
      );
      setHasEverRequestedOlder(true);
      scrollRestoreRef.current = { prevScrollHeight, prevScrollTop };
    } catch (e) {
      setOlderLoadError(e instanceof Error ? e.message : "Error al cargar mensajes anteriores");
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMoreHistory, loadingHistory, loadingOlder, messages, tareaId]);

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
          Pregunta sobre tareas y revisiones. El contexto general usa las tareas disponibles del proyecto.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-elegant min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        {loadingHistory && <p className="text-sm text-zinc-500">Cargando historial...</p>}

        {!loadingHistory && messages.length > 0 && (
          <div className="flex flex-col items-center gap-2 pb-1">
            {olderLoadError ? (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-rose-200/80 bg-rose-50/90 px-3 py-1.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <span className="text-center">{olderLoadError}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 shrink-0 rounded-full px-2.5 text-xs text-rose-900 hover:bg-rose-100/80 dark:text-rose-100 dark:hover:bg-rose-900/50"
                  onClick={() => {
                    setOlderLoadError(null);
                    void loadOlderMessages();
                  }}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}

            {hasMoreHistory && !loadingOlder && !olderLoadError ? (
              <button
                type="button"
                onClick={() => void loadOlderMessages()}
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-md px-2 py-1.5",
                  "text-[11px] font-medium leading-none tracking-wide text-zinc-500",
                  "transition-[color,background-color,transform] duration-200 ease-out",
                  "hover:bg-zinc-200/60 hover:text-zinc-800",
                  "active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50/0 dark:focus-visible:ring-zinc-500/35 dark:focus-visible:ring-offset-transparent",
                  "dark:text-zinc-400 dark:hover:bg-zinc-800/55 dark:hover:text-zinc-200",
                )}
              >
                <ChevronUp
                  className="size-3 shrink-0 opacity-50 transition-[opacity,transform] duration-200 group-hover:opacity-80 group-hover:-translate-y-px"
                  strokeWidth={2}
                  aria-hidden
                />
                <span>Cargar mensajes anteriores</span>
              </button>
            ) : null}

            {loadingOlder ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                <span
                  className="size-3 shrink-0 animate-spin rounded-full border border-zinc-300/80 border-t-transparent dark:border-zinc-500/70 dark:border-t-transparent"
                  aria-hidden
                />
                Cargando mensajes…
              </div>
            ) : null}

            {!hasMoreHistory && hasEverRequestedOlder ? (
              <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                No hay más mensajes anteriores
              </p>
            ) : null}
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <EmptyState
            compact
            icon={MessageSquare}
            title="Aún no hay mensajes"
            description="Escribe una pregunta en el campo de abajo para comenzar a conversar con el asistente."
          />
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={messageRowKey(m)}
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
              className={cn("flex w-full", m.rol === "user" ? "justify-end" : "justify-start")}
            >
              <motion.div
                layout={isLocalMessageId(m.id) || Boolean(m.correlationId)}
                className={cn(
                  "max-w-[min(100%,52rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.rol === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
                  m.status === "error" && m.rol === "assistant"
                    ? "border-rose-300/80 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/30"
                    : null,
                )}
              >
                {m.rol === "user" ? (
                  <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
                ) : (
                  <div className="min-w-0 break-words">
                    {m.status === "loading" && m.correlationId ? (
                      <motion.div
                        layoutId={`asst-bubble-${m.correlationId}`}
                        className="min-h-[2.5rem]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      >
                        <ChatAssistantPlaceholder />
                      </motion.div>
                    ) : m.status === "error" ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200">
                          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <div>
                            <p className="font-medium">No se pudo obtener respuesta</p>
                            <p className="mt-1 text-xs opacity-90">{m.errorDetail ?? "Error desconocido"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="default"
                            disabled={inFlight}
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              if (m.correlationId) void retryPair(m.correlationId);
                            }}
                          >
                            Reintentar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              if (m.correlationId) removeFailedPair(m.correlationId);
                            }}
                          >
                            Descartar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        layoutId={m.correlationId ? `asst-bubble-${m.correlationId}` : undefined}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      >
                        <AnalysisMarkdown source={m.mensaje} compact className="[&_a]:break-all" />
                      </motion.div>
                    )}
                  </div>
                )}
                <p className="mt-1 text-[10px] opacity-60">
                  {m.status === "loading"
                    ? "…"
                    : new Date(m.created_at).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="h-px shrink-0" aria-hidden />
      </div>

      {error && !messages.some((m) => m.status === "error") && (
        <p className="shrink-0 text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      <div
        className={cn(
          "flex shrink-0 items-end gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/95 p-2 pl-3 shadow-sm ring-1 ring-zinc-900/[0.03] dark:border-zinc-700/90 dark:bg-zinc-900/55 dark:ring-white/[0.04]",
          "transition-[box-shadow,border-color] duration-200 ease-out",
          "focus-within:border-zinc-300 focus-within:shadow-md focus-within:ring-zinc-900/[0.06] dark:focus-within:border-zinc-600 dark:focus-within:ring-white/[0.06]",
        )}
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={inFlight || loadingHistory}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className={cn(
            "!min-h-0 max-h-none flex-1 resize-none border-0 bg-transparent py-3 pr-1 text-sm leading-relaxed",
            "shadow-none outline-none ring-0 placeholder:text-zinc-500/85 dark:bg-transparent dark:placeholder:text-zinc-500",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "scrollbar-elegant",
          )}
          style={{
            minHeight: CHAT_COMPOSER_MIN_HEIGHT_PX,
            maxHeight: CHAT_COMPOSER_MAX_HEIGHT_PX,
          }}
        />
        <Button
          type="button"
          disabled={inFlight || loadingHistory || !input.trim()}
          onClick={() => void send()}
          aria-label="Enviar mensaje"
          aria-busy={inFlight}
          className="size-9 shrink-0 rounded-xl p-0 sm:size-10"
        >
          {inFlight ? (
            <span className="inline-flex size-5 items-center justify-center">
              <span className="size-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent dark:border-zinc-500 dark:border-t-transparent" />
            </span>
          ) : (
            <SendArrowIcon className="size-5" />
          )}
        </Button>
      </div>
    </Card>
  );
}
