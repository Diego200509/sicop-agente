import { ChatPanel } from "@/src/components/chat/chat-panel";
import { AppPageShell } from "@/src/components/layout/app-page-shell";

export default function ChatPage() {
  return (
    <AppPageShell
      title="Chat"
      description="Consultas generales sobre tareas y revisiones del sistema."
      fillHeight
      className="gap-2"
      headerClassName="space-y-0.5"
    >
      <ChatPanel className="min-h-0 flex-1" title="Chat general" />
    </AppPageShell>
  );
}
