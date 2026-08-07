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
        "w-full rounded-[26px] border px-4 py-4 text-left transition",
        isSelected
          ? "border-[rgba(31,111,100,0.2)] bg-[var(--accent-soft)] shadow-[0_14px_28px_rgba(31,111,100,0.08)]"
          : "border-transparent bg-white/80 hover:border-[var(--border)] hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-slate-950">{conversation.contact_name ?? conversation.contact_phone}</p>
          <p className="mt-1 truncate text-[12px] text-[var(--muted)]">{previewText(conversation.last_message_preview, "Sem mensagens")}</p>
        </div>
        <span className="shrink-0 text-[11px] text-slate-400">{formatConversationTime(conversation.last_message_at)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
            conversation.mode === "human" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800",
          )}
        >
          {conversation.mode === "human" ? "Humano" : "Agente"}
        </span>
        {conversation.unread_count > 0 ? (
          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold text-white">{conversation.unread_count}</span>
        ) : null}
      </div>
    </button>
  );
}
