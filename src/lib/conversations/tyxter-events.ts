import type { SupabaseClient } from "@supabase/supabase-js";

import {
  asUuidOrNull,
  inferAuthorType,
  extractMediaCaption,
  extractMediaAssetId,
  extractMediaFilename,
  extractMediaKind,
  extractMediaMimeType,
  extractMediaUrl,
  extractMessageType,
  extractTextFromPayload,
  extractTranscriptFromPayload,
} from "@/lib/conversations/service";
import {
  getOrCreateConversation,
  recordProcessedWebhookEvent,
  updateMessageStatus,
  updateMessageTranscription,
  upsertInboundMessage,
  upsertOutboundMessage,
} from "@/lib/conversations/repository";
import { getTyxterMessage } from "@/lib/tyxter/messages";
import type { TyxterWebhookEnvelope } from "@/lib/tyxter/types";

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getEnvelopeEvent(envelope: TyxterWebhookEnvelope) {
  if (envelope.payload?.type) {
    return {
      eventId: envelope.id ?? envelope.payload.id ?? null,
      eventType: envelope.payload.type,
      data: envelope.payload.data ?? {},
      occurredAt: envelope.payload.occurred_at ?? envelope.payload.created_at ?? envelope.occurred_at ?? envelope.created_at ?? new Date().toISOString(),
    };
  }

  return {
    eventId: envelope.id ?? null,
    eventType: envelope.type,
    data: envelope.data ?? {},
    occurredAt: envelope.occurred_at ?? envelope.created_at ?? new Date().toISOString(),
  };
}

function normalizePhone(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function transcriptionValues(data: Record<string, unknown>) {
  const transcription = asRecord(data.transcription) ?? data;
  const rawStatus = transcription.status;
  const status: "pending" | "succeeded" | "failed" = rawStatus === "succeeded" || rawStatus === "failed" ? rawStatus : "pending";
  const transcript = normalizePhone(transcription.text) ?? normalizePhone(transcription.transcript);
  const errorRecord = asRecord(transcription.error);
  const error = normalizePhone(transcription.error) ?? normalizePhone(errorRecord?.message);
  return { status, transcript, error };
}

async function enrichMinimalPayload(messageId: string, payload: Record<string, unknown> | null, metadata: Record<string, unknown> | null) {
  const isMinimalMediaPayload = payload?.type === "media" && Object.keys(payload).length <= 1;

  if (!isMinimalMediaPayload) {
    return { payload, metadata };
  }

  try {
    const detail = await getTyxterMessage(messageId);
    return {
      payload: asRecord(detail.payload) ?? payload,
      metadata: asRecord(detail.metadata) ?? metadata,
    };
  } catch {
    return { payload, metadata };
  }
}

export async function processTyxterWebhook(client: SupabaseClient, envelope: TyxterWebhookEnvelope) {
  const event = getEnvelopeEvent(envelope);

  if (event.eventId) {
    const shouldProcess = await recordProcessedWebhookEvent(client, event.eventId, event.eventType);

    if (!shouldProcess) {
      return { deduped: true };
    }
  }

  const data = asRecord(event.data) ?? {};
  const payload = asRecord(data.payload) ?? asRecord(data.content) ?? null;
  const metadata = asRecord(data.metadata);
  const sender = asRecord(data.sender);
  const recipient = asRecord(data.recipient);
  const message = asRecord(data.message);
  const messageId = normalizePhone(data.message_id) ?? normalizePhone(data.id) ?? normalizePhone(message?.id);

  switch (event.eventType) {
    case "message.received": {
      if (!messageId) {
        return { ignored: true };
      }

      const contactPhone = normalizePhone(sender?.id);
      const phoneNumberId = normalizePhone(recipient?.id);

      if (!contactPhone || !phoneNumberId) {
        return { ignored: true };
      }

      const enriched = await enrichMinimalPayload(messageId, payload, metadata);

      const conversation = await getOrCreateConversation(client, {
        phone_number_id: phoneNumberId,
        contact_phone: contactPhone,
        contact_name: normalizePhone(data.contact_name),
      });

      await upsertInboundMessage(client, {
        conversation_id: conversation.id,
        tyxter_message_id: messageId,
        author_type: "customer",
        message_type: extractMessageType(enriched.payload),
        text_body: extractTextFromPayload(enriched.payload),
        media_kind: extractMediaKind(enriched.payload),
        media_asset_id: extractMediaAssetId(enriched.payload),
        media_url: extractMediaUrl(enriched.payload),
        media_mime_type: extractMediaMimeType(enriched.payload),
        media_filename: extractMediaFilename(enriched.payload),
        media_caption: extractMediaCaption(enriched.payload),
        transcript: extractTranscriptFromPayload(enriched.payload),
        payload: enriched.payload,
        metadata: enriched.metadata,
        status: "received",
        occurred_at: event.occurredAt,
      });

      return { ok: true };
    }
    case "message.sent": {
      if (!messageId) {
        return { ignored: true };
      }

      const contactPhone = normalizePhone(recipient?.id);
      const phoneNumberId = normalizePhone(sender?.id);

      if (!contactPhone || !phoneNumberId) {
        return { ignored: true };
      }

      const enriched = await enrichMinimalPayload(messageId, payload, metadata);

      const conversation = await getOrCreateConversation(client, {
        phone_number_id: phoneNumberId,
        contact_phone: contactPhone,
      });

      await upsertOutboundMessage(client, {
        conversation_id: conversation.id,
        tyxter_message_id: messageId,
        author_type: inferAuthorType(enriched.metadata),
        operator_id: asUuidOrNull(enriched.metadata?.operator_id),
        message_type: extractMessageType(enriched.payload),
        text_body: extractTextFromPayload(enriched.payload),
        media_kind: extractMediaKind(enriched.payload),
        media_asset_id: extractMediaAssetId(enriched.payload),
        media_url: extractMediaUrl(enriched.payload),
        media_mime_type: extractMediaMimeType(enriched.payload),
        media_filename: extractMediaFilename(enriched.payload),
        media_caption: extractMediaCaption(enriched.payload),
        transcript: extractTranscriptFromPayload(enriched.payload),
        payload: enriched.payload,
        metadata: enriched.metadata,
        status: "sent",
        occurred_at: event.occurredAt,
      });

      return { ok: true };
    }
    case "message.delivered":
    case "message.read":
    case "message.failed": {
      if (!messageId) {
        return { ignored: true };
      }

      const nextStatus = event.eventType.replace("message.", "");
      const failureMetadata =
        event.eventType === "message.failed"
          ? {
              error_code: data.error_code,
              error_message: data.error_message,
              provider_error: data.provider_error,
            }
          : undefined;

      await updateMessageStatus(client, messageId, nextStatus, failureMetadata);
      return { ok: true };
    }
    case "message.media_transcribed": {
      if (!messageId) return { ignored: true };
      await updateMessageTranscription(client, messageId, transcriptionValues(data));
      return { ok: true };
    }
    default:
      return { ignored: true };
  }
}
