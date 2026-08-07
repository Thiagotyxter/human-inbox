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
      className="border-t border-[var(--border)] bg-white/58 px-6 py-5 backdrop-blur-sm"
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
          className="min-h-[96px] flex-1 rounded-[26px] border border-[var(--border)] bg-white px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={disabled || isSending || text.trim().length === 0}
          className="self-end rounded-[22px] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_26px_rgba(31,111,100,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
