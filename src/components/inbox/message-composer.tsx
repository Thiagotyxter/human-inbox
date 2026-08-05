"use client";

import { useState } from "react";

export function MessageComposer({
  disabled,
  isSending,
  onSend,
}: {
  disabled: boolean;
  isSending: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");

  return (
    <form
      className="border-t border-slate-200 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextText = text.trim();

        if (!nextText || disabled) {
          return;
        }

        await onSend(nextText);
        setText("");
      }}
    >
      <div className="flex gap-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled || isSending}
          placeholder={disabled ? "Assuma a conversa para enviar mensagens." : "Digite uma mensagem"}
          className="min-h-[88px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={disabled || isSending || text.trim().length === 0}
          className="self-end rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
