import { randomUUID } from "node:crypto";

import { tyxterFetch, tyxterFetchRaw } from "@/lib/tyxter/client";
import type { TyxterListResponse, TyxterMessage } from "@/lib/tyxter/types";

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
  return tyxterFetch<TyxterMessage>(`/v1/messages/${messageId}`);
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

function extractMediaLink(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidates = [
    record.link,
    record.url,
    (record.audio as Record<string, unknown> | undefined)?.link,
    (record.media as Record<string, unknown> | undefined)?.link,
    (record.media as Record<string, unknown> | undefined)?.url,
    (record.generated_audio as Record<string, unknown> | undefined)?.preview_url,
    (record.generated_audio as Record<string, unknown> | undefined)?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}

export async function resolveTyxterMessageMediaUrl(messageId: string) {
  const detail = await getTyxterMessage(messageId);
  const link =
    extractMediaLink(detail.payload) ??
    extractMediaLink((detail.payload as Record<string, unknown> | null)?.message) ??
    extractMediaLink(detail.metadata);

  if (!link) {
    return null;
  }

  return link;
}

export async function fetchTyxterMedia(link: string) {
  const url = new URL(link);

  if (url.origin === new URL("https://api.tyxter.com").origin) {
    return tyxterFetchRaw(url.pathname + url.search);
  }

  return fetch(link, { cache: "no-store", redirect: "follow" });
}
