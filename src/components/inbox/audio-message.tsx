"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { MessageRecord } from "@/lib/app-types";

export function AudioMessage({ message }: { message: MessageRecord }) {
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestTranscription() {
    setIsRequesting(true);
    setError(null);
    try {
      const response = await fetch(`/api/messages/${message.id}/transcription`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Falha ao solicitar transcricao.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao solicitar transcricao.");
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <div className="space-y-2">
      <audio className="w-full min-w-[220px]" controls src={`/api/messages/${message.id}/media`} preload="metadata" />
      {message.direction === "inbound" && !message.transcription_status ? (
        <button className="text-xs font-medium underline underline-offset-4 disabled:opacity-50" disabled={isRequesting} onClick={requestTranscription} type="button">
          {isRequesting ? "Solicitando transcricao..." : "Transcrever audio"}
        </button>
      ) : null}
      {message.transcription_status === "pending" ? <p className="text-xs opacity-70">Transcricao em andamento...</p> : null}
      {message.transcription_status === "failed" ? <p className="text-xs text-rose-600">{message.transcription_error ?? "Nao foi possivel transcrever este audio."}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
