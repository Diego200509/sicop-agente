import { ChatPanel } from "@/src/components/chat/chat-panel";

export default function ChatPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 overflow-hidden min-h-0">
      <div className="shrink-0 space-y-0.5">
        <h2 className="text-2xl font-semibold sm:text-3xl">Chat</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Consultas generales sobre tareas y revisiones del sistema.
        </p>
      </div>

      <ChatPanel className="min-h-0 flex-1" title="Chat general" />
    </section>
  );
}
