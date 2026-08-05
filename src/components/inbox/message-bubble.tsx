"use client";

import type { MessageRecord } from "@/lib/app-types";
import { AudioMessage } from "@/components/inbox/audio-message";
import { cn } from "@/lib/utils";

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function authorLabel(message: MessageRecord) {
  if (message.author_type === "customer") return "Cliente";
  if (message.author_type === "human") return "Humano";
  if (message.author_type === "agent") return "Agente";
  return "Sistema";
}

export function MessageBubble({ message }: { message: MessageRecord }) {
  const isInbound = message.direction === "inbound";
  const isAudio = message.media_kind === "audio";

  return (
    <div className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[82%] rounded-3xl px-4 py-3 shadow-sm",
          isInbound ? "bg-white text-slate-900" : "bg-[var(--accent)] text-white",
        )}
      >
        <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]", isInbound ? "text-slate-400" : "text-white/70")}>
          {authorLabel(message)}
        </div>

        {isAudio ? <AudioMessage messageId={message.id} /> : null}
        {message.text_body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.text_body}</p> : null}
        {!message.text_body && !isAudio ? (
          <p className={cn("text-sm italic", isInbound ? "text-slate-500" : "text-white/80")}>
            Tipo de mensagem: {message.message_type}
          </p>
        ) : null}

        <div className={cn("mt-3 flex items-center gap-3 text-[11px]", isInbound ? "text-slate-400" : "text-white/70")}>
          <span>{formatMessageTime(message.occurred_at)}</span>
          {message.status ? <span>{message.status}</span> : null}
        </div>
      </div>
    </div>
  );
}
