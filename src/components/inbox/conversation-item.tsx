import type { ConversationRecord } from "@/lib/app-types";
import { cn, previewText } from "@/lib/utils";

function formatConversationTime(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: ConversationRecord;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        isSelected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-transparent bg-white hover:border-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{conversation.contact_name ?? conversation.contact_phone}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{previewText(conversation.last_message_preview, "Sem mensagens")}</p>
        </div>
        <span className="shrink-0 text-[11px] text-slate-400">{formatConversationTime(conversation.last_message_at)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            conversation.mode === "human" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700",
          )}
        >
          {conversation.mode === "human" ? "Humano" : "Agente"}
        </span>
        {conversation.unread_count > 0 ? (
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">{conversation.unread_count}</span>
        ) : null}
      </div>
    </button>
  );
}
