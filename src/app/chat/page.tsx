import { ChatPanel } from "@/src/components/chat/chat-panel";

export default function ChatPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">Chat</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Consultas generales sobre tareas y revisiones del sistema.
        </p>
      </div>

      <ChatPanel title="Chat general" />
    </section>
  );
}
