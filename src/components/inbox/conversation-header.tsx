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
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Inbox</p>
          <p className="text-sm text-slate-500">Selecione uma conversa.</p>
        </div>
      </div>
    );
  }

  const currentPhoneNumber = phoneNumbers.find((phoneNumber) => phoneNumber.id === conversation.phone_number_id);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{conversation.contact_name ?? conversation.contact_phone}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>Numero da empresa: {currentPhoneNumber?.display_phone_number ?? conversation.phone_number_id}</span>
          <span>Modo atual: {conversation.mode === "human" ? "Humano" : "Agente"}</span>
          {conversation.assigned_operator?.name ? <span>Responsavel: {conversation.assigned_operator.name}</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={conversation.mode === "human" || isSubmitting}
          onClick={onTakeover}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Assumir conversa
        </button>
        <button
          type="button"
          disabled={conversation.mode === "agent" || isSubmitting}
          onClick={onRelease}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Devolver ao agente
        </button>
      </div>
    </div>
  );
}
