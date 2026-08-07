import type { ConversationWithMessages, PhoneNumberOption } from "@/lib/app-types";

export function ConversationHeader({
  conversation,
  phoneNumbers,
  isSubmitting,
  onTakeover,
  onRelease,
}: {
  conversation: ConversationWithMessages | null;
  phoneNumbers: PhoneNumberOption[];
  isSubmitting: boolean;
  onTakeover: () => void;
  onRelease: () => void;
}) {
  if (!conversation) {
    return (
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Inbox</p>
          <p className="mt-1 text-sm text-slate-500">Selecione uma conversa.</p>
        </div>
      </div>
    );
  }

  const currentPhoneNumber = phoneNumbers.find((phoneNumber) => phoneNumber.id === conversation.phone_number_id);

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[var(--border)] px-6 py-6">
      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Contato ativo</p>
          <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.05em] text-slate-950">{conversation.contact_name ?? conversation.contact_phone}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-slate-600">
            Empresa: {currentPhoneNumber?.display_phone_number ?? conversation.phone_number_id}
          </span>
          <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-slate-600">
            Modo: {conversation.mode === "human" ? "Humano" : "Agente"}
          </span>
          {conversation.assigned_operator?.name ? (
            <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-slate-600">
              Responsavel: {conversation.assigned_operator.name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={conversation.mode === "human" || isSubmitting}
          onClick={onTakeover}
          className="rounded-[20px] border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Assumir conversa
        </button>
        <button
          type="button"
          disabled={conversation.mode === "agent" || isSubmitting}
          onClick={onRelease}
          className="rounded-[20px] bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Devolver ao agente
        </button>
      </div>
    </div>
  );
}
