import type { SupabaseClient } from "@supabase/supabase-js";

import { asUuidOrNull, inferAuthorType, extractMediaKind, extractMessageType, extractTextFromPayload } from "@/lib/conversations/service";
import {
  getOrCreateConversation,
  recordProcessedWebhookEvent,
  updateMessageStatus,
  upsertInboundMessage,
  upsertOutboundMessage,
} from "@/lib/conversations/repository";
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
  const messageId = normalizePhone(data.message_id) ?? normalizePhone(data.id);

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

      const conversation = await getOrCreateConversation(client, {
        phone_number_id: phoneNumberId,
        contact_phone: contactPhone,
        contact_name: normalizePhone(data.contact_name),
      });

      await upsertInboundMessage(client, {
        conversation_id: conversation.id,
        tyxter_message_id: messageId,
        author_type: "customer",
        message_type: extractMessageType(payload),
        text_body: extractTextFromPayload(payload),
        media_kind: extractMediaKind(payload),
        payload,
        metadata,
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

      const conversation = await getOrCreateConversation(client, {
        phone_number_id: phoneNumberId,
        contact_phone: contactPhone,
      });

      await upsertOutboundMessage(client, {
        conversation_id: conversation.id,
        tyxter_message_id: messageId,
        author_type: inferAuthorType(metadata),
        operator_id: asUuidOrNull(metadata?.operator_id),
        message_type: extractMessageType(payload),
        text_body: extractTextFromPayload(payload),
        media_kind: extractMediaKind(payload),
        payload,
        metadata,
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
    default:
      return { ignored: true };
  }
}
