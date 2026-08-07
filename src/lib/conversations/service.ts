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

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function collectCandidateRecords(payload: Record<string, unknown> | null | undefined) {
  if (!payload) {
    return [];
  }

  const content = asRecord(payload.content);
  const message = asRecord(payload.message);
  const media = asRecord(payload.media);

  return [
    payload,
    content,
    message,
    media,
    asRecord(content?.media),
    asRecord(content?.audio),
    asRecord(content?.image),
    asRecord(content?.document),
    asRecord(content?.video),
    asRecord(content?.sticker),
    asRecord(payload.audio),
    asRecord(payload.image),
    asRecord(payload.document),
    asRecord(payload.video),
    asRecord(payload.sticker),
    asRecord(message?.media),
    asRecord(message?.audio),
    asRecord(message?.image),
    asRecord(message?.document),
    asRecord(message?.video),
    asRecord(message?.sticker),
    asRecord(media?.audio),
    asRecord(media?.image),
    asRecord(media?.document),
    asRecord(media?.video),
    asRecord(media?.sticker),
  ].filter((value): value is Record<string, unknown> => Boolean(value));
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
    ((payload?.message as Record<string, unknown> | undefined)?.media as Record<string, unknown> | undefined)?.kind ??
    (typeof payload?.type === "string" ? payload.type : null);

  return typeof mediaKind === "string" && ["audio", "image", "video", "document", "sticker", "media"].includes(mediaKind) ? mediaKind : null;
}

export function extractMediaAssetId(payload: Record<string, unknown> | null | undefined) {
  for (const record of collectCandidateRecords(payload)) {
    const assetId = firstString(record.asset_id);
    if (assetId) return assetId;
  }

  return null;
}

export function extractMediaUrl(payload: Record<string, unknown> | null | undefined) {
  for (const record of collectCandidateRecords(payload)) {
    const url = firstString(record.link, record.url, record.download_url, record.preview_url, record.src);
    if (url) {
      return url;
    }
  }

  return null;
}

export function extractMediaMimeType(payload: Record<string, unknown> | null | undefined) {
  for (const record of collectCandidateRecords(payload)) {
    const mimeType = firstString(record.mime_type, record.mimetype, record.content_type, record.type);
    if (mimeType && mimeType.includes("/")) {
      return mimeType;
    }
  }

  return null;
}

export function extractMediaFilename(payload: Record<string, unknown> | null | undefined) {
  for (const record of collectCandidateRecords(payload)) {
    const filename = firstString(record.filename, record.file_name, record.name, record.title);
    if (filename) {
      return filename;
    }
  }

  return null;
}

export function extractMediaCaption(payload: Record<string, unknown> | null | undefined) {
  for (const record of collectCandidateRecords(payload)) {
    const caption = firstString(record.caption, record.description);
    if (caption) {
      return caption;
    }
  }

  return null;
}

export function extractTranscriptFromPayload(payload: Record<string, unknown> | null | undefined) {
  for (const record of collectCandidateRecords(payload)) {
    const transcript = firstString(
      record.transcript,
      record.transcription,
      record.text,
      asRecord(record.transcript)?.text,
      asRecord(record.transcription)?.text,
    );
    if (transcript) {
      return transcript;
    }
  }

  return null;
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
