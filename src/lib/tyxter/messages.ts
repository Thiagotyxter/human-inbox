import { randomUUID } from "node:crypto";

import { env, requireTyxterApiKey } from "@/lib/env";
import { tyxterFetch } from "@/lib/tyxter/client";
import type { TyxterListResponse, TyxterMediaDownloadCapability, TyxterMessage, TyxterMessageTranscription } from "@/lib/tyxter/types";

export interface ListMessagesParams {
  direction?: "inbound" | "outbound";
  includePayload?: boolean;
  limit?: number;
  startingAfter?: string | null;
}

export async function listTyxterMessages(params: ListMessagesParams) {
  return tyxterFetch<TyxterListResponse<TyxterMessage>>("/v1/messages", {
    query: {
      direction: params.direction,
      include: params.includePayload ? "payload" : undefined,
      limit: params.limit ?? 100,
      starting_after: params.startingAfter ?? undefined,
    },
  });
}

export async function getTyxterMessage(messageId: string) {
  return tyxterFetch<TyxterMessage>(`/v1/messages/${messageId}`, {
    query: {
      include: "payload",
    },
  });
}

export async function createTyxterMediaDownloadUrl(assetId: string) {
  const capability = await tyxterFetch<TyxterMediaDownloadCapability>(`/v1/media/${encodeURIComponent(assetId)}/download-url`);
  const url = capability.download_url ?? capability.url ?? capability.data?.download_url ?? capability.data?.url;

  if (!url) throw new Error("Tyxter did not return a media download URL.");
  return url;
}

export async function requestTyxterMessageTranscription(messageId: string) {
  return tyxterFetch<TyxterMessageTranscription>(`/v1/messages/${encodeURIComponent(messageId)}/transcription`, { method: "POST" });
}

export async function getTyxterMessageTranscription(messageId: string) {
  return tyxterFetch<TyxterMessageTranscription>(`/v1/messages/${encodeURIComponent(messageId)}/transcription`);
}

export async function sendTyxterTextMessage(params: {
  senderPhoneNumberId: string;
  recipientPhone: string;
  text: string;
  metadata: Record<string, unknown>;
}) {
  return tyxterFetch<TyxterMessage>("/v1/messages", {
    method: "POST",
    headers: {
      "Idempotency-Key": randomUUID(),
    },
    body: {
      channel: "whatsapp",
      sender: { type: "whatsapp_phone_number", id: params.senderPhoneNumberId },
      recipient: { type: "phone_e164", id: params.recipientPhone },
      message: { type: "text", text: { body: params.text } },
      metadata: params.metadata,
    },
  });
}

export async function fetchTyxterMedia(link: string, range?: string | null) {
  const linkUrl = new URL(link);
  const tyxterOrigin = new URL(env.TYXTER_API_BASE_URL).origin;
  const headers = new Headers();

  if (range) headers.set("Range", range);
  if (linkUrl.origin === tyxterOrigin) headers.set("Authorization", `Bearer ${requireTyxterApiKey()}`);

  return fetch(link, {
    cache: "no-store",
    redirect: "follow",
    headers,
  });
}
