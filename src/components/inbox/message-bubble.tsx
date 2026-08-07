"use client";

import Link from "next/link";

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

function mediaLabel(message: MessageRecord) {
  if (message.media_filename) return message.media_filename;
  if (message.media_kind === "image") return "Imagem";
  if (message.media_kind === "video") return "Video";
  if (message.media_kind === "document") return "Documento";
  if (message.media_kind === "audio") return "Audio";
  return "Midia";
}

export function MessageBubble({ message }: { message: MessageRecord }) {
  const isInbound = message.direction === "inbound";
  const resolvedMediaKind = message.media_kind ?? (["audio", "image", "video", "document", "sticker"].includes(message.message_type) ? message.message_type : null);
  const isAudio = resolvedMediaKind === "audio";
  const isImage = resolvedMediaKind === "image" || resolvedMediaKind === "sticker";
  const hasMedia = Boolean(resolvedMediaKind);
  const mediaSource = `/api/messages/${message.id}/media`;
  const shouldRenderAttachment = hasMedia && !isAudio && !isImage;

  return (
    <div className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[78%] rounded-[30px] px-4 py-3.5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]",
          isInbound
            ? "border border-[var(--border)] bg-white/95 text-slate-900"
            : "bg-[var(--accent)] text-white shadow-[0_18px_34px_rgba(31,111,100,0.18)]",
        )}
      >
        <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]", isInbound ? "text-slate-400" : "text-white/72")}>
          {authorLabel(message)}
        </div>

        {isAudio ? <AudioMessage message={message} /> : null}
        {isImage ? (
          <Link className="mb-3 block" href={mediaSource} target="_blank">
            <img
              alt={message.media_caption ?? message.media_filename ?? "Imagem recebida"}
              className="max-h-80 w-full rounded-[20px] object-cover"
              src={mediaSource}
            />
          </Link>
        ) : null}
        {shouldRenderAttachment ? (
          <Link
            className={cn(
              "mb-3 flex items-center justify-between rounded-[20px] border px-3 py-2 text-sm",
              isInbound ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/20 bg-white/10 text-white",
            )}
            href={mediaSource}
            target="_blank"
          >
            <span className="truncate">{mediaLabel(message)}</span>
            <span className="ml-3 shrink-0 text-xs opacity-75">Abrir</span>
          </Link>
        ) : null}
        {message.text_body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.text_body}</p> : null}
        {!message.text_body && message.media_caption ? <p className="whitespace-pre-wrap text-sm leading-6">{message.media_caption}</p> : null}
        {isAudio && message.transcript ? (
          <div className={cn("mt-3 rounded-[18px] px-3 py-2 text-sm", isInbound ? "bg-slate-50 text-slate-700" : "bg-white/10 text-white/90")}>
            {message.transcript}
          </div>
        ) : null}
        {!message.text_body && !message.media_caption && !isAudio && !hasMedia ? (
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
