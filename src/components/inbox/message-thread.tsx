import type { ConversationWithMessages } from "@/lib/app-types";
import { MessageBubble } from "@/components/inbox/message-bubble";

export function MessageThread({ conversation }: { conversation: ConversationWithMessages | null }) {
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
        Selecione uma conversa para visualizar o historico e responder manualmente.
      </div>
    );
  }

  if (conversation.messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
        Nenhuma mensagem encontrada nesta conversa.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
      {conversation.messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
