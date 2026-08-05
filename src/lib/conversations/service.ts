import type { MessageAuthorType } from "@/lib/app-types";

export const MESSAGE_STATUS_ORDER = ["queued", "sent", "delivered", "read", "failed"] as const;

const statusRanks = new Map<string, number>(MESSAGE_STATUS_ORDER.map((status, index) => [status, index]));

export function getStatusRank(status: string | null | undefined) {
  if (!status) {
    return -1;
  }

  return statusRanks.get(status) ?? -1;
}

export function shouldUpdateMessageStatus(currentStatus: string | null | undefined, nextStatus: string | null | undefined) {
  if (!nextStatus) {
    return false;
  }

  return getStatusRank(nextStatus) >= getStatusRank(currentStatus);
}

export function inferAuthorType(metadata: Record<string, unknown> | null | undefined): MessageAuthorType {
  const source = metadata?.source;

  if (source === "human_inbox") {
    return "human";
  }

  if (source === "agent") {
    return "agent";
  }

  return "agent";
}

export function asUuidOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

export function extractTextFromPayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload) {
    return null;
  }

  const text =
    (payload.text as Record<string, unknown> | undefined)?.body ??
    (payload.content as Record<string, unknown> | undefined)?.text ??
    ((payload.content as Record<string, unknown> | undefined)?.text as Record<string, unknown> | undefined)?.body ??
    ((payload.message as Record<string, unknown> | undefined)?.text as Record<string, unknown> | undefined)?.body;

  return typeof text === "string" ? text : null;
}

export function extractMessageType(payload: Record<string, unknown> | null | undefined) {
  const contentType =
    (payload?.content as Record<string, unknown> | undefined)?.type ??
    (payload?.message as Record<string, unknown> | undefined)?.type ??
    payload?.type;

  return typeof contentType === "string" ? contentType : "unknown";
}

export function extractMediaKind(payload: Record<string, unknown> | null | undefined) {
  const mediaKind =
    (payload?.media as Record<string, unknown> | undefined)?.kind ??
    ((payload?.content as Record<string, unknown> | undefined)?.media as Record<string, unknown> | undefined)?.kind ??
    ((payload?.message as Record<string, unknown> | undefined)?.media as Record<string, unknown> | undefined)?.kind;

  return typeof mediaKind === "string" ? mediaKind : null;
}

export function buildLastMessagePreview(params: { textBody?: string | null; messageType: string; mediaKind?: string | null }) {
  if (params.textBody) {
    return params.textBody;
  }

  if (params.messageType === "media" || params.mediaKind) {
    return params.mediaKind === "audio" ? "Audio" : `Midia: ${params.mediaKind ?? "arquivo"}`;
  }

  return `Mensagem ${params.messageType}`;
}
