import type { ConversationWithMessages } from "@/lib/app-types";
import { MessageBubble } from "@/components/inbox/message-bubble";

export function MessageThread({ conversation }: { conversation: ConversationWithMessages | null }) {
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
        Selecione uma conversa para visualizar o historico e responder manualmente.
      </div>
    );
  }

  if (conversation.messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
        Nenhuma mensagem encontrada nesta conversa.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-7 md:px-8">
      {conversation.messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
