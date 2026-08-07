import type { ConversationRecord } from "@/lib/app-types";
import { ConversationItem } from "@/components/inbox/conversation-item";

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelect,
}: {
  conversations: ConversationRecord[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/65 p-6 text-sm text-[var(--muted)]">
        Nenhuma conversa encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={conversation.id === selectedConversationId}
          onClick={() => onSelect(conversation.id)}
        />
      ))}
    </div>
  );
}
