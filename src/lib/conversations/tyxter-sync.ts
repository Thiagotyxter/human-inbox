import type { SupabaseClient } from "@supabase/supabase-js";

import { inferAuthorType, extractMediaKind, extractMessageType, extractTextFromPayload } from "@/lib/conversations/service";
import {
  getOrCreateConversation,
  upsertInboundMessage,
  upsertOutboundMessage,
} from "@/lib/conversations/repository";
import { getTyxterMessage, listTyxterMessages } from "@/lib/tyxter/messages";
import type { TyxterMessage } from "@/lib/tyxter/types";

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeMessageCore(message: TyxterMessage) {
  const payload = asRecord(message.payload);
  const metadata = asRecord(message.metadata);
  const sender = asRecord(message.sender);
  const recipient = asRecord(message.recipient);
  const direction = sender?.type === "phone_e164" ? "inbound" : "outbound";
  const contactPhone = direction === "inbound" ? (sender?.id as string | undefined) : (recipient?.id as string | undefined);
  const phoneNumberId = direction === "inbound" ? (recipient?.id as string | undefined) : (sender?.id as string | undefined);
  const messageType = extractMessageType(payload);
  const textBody = extractTextFromPayload(payload);
  const mediaKind = extractMediaKind(payload);
  const occurredAt = message.occurred_at ?? message.updated_at ?? message.created_at ?? new Date().toISOString();

  return {
    direction,
    payload,
    metadata,
    contactPhone,
    phoneNumberId,
    messageType,
    textBody,
    mediaKind,
    occurredAt,
  };
}

async function ensurePayload(message: TyxterMessage) {
  if (message.payload) {
    return message;
  }

  return getTyxterMessage(message.id);
}

export async function syncTyxterMessages(
  client: SupabaseClient,
  params: { phoneNumberId?: string | null; limitPerPage?: number },
) {
  const directions: Array<"inbound" | "outbound"> = ["inbound", "outbound"];
  let importedMessages = 0;
  let createdConversations = 0;
  let skippedDuplicates = 0;
  const seenConversationKeys = new Set<string>();

  for (const direction of directions) {
    let cursor: string | null = null;

    do {
      const page = await listTyxterMessages({
        direction,
        includePayload: true,
        limit: params.limitPerPage ?? 100,
        startingAfter: cursor,
      });

      for (const summaryMessage of page.data) {
        const message = await ensurePayload(summaryMessage);
        const normalized = normalizeMessageCore(message);

        if (!normalized.contactPhone || !normalized.phoneNumberId) {
          continue;
        }

        if (params.phoneNumberId && normalized.phoneNumberId !== params.phoneNumberId) {
          continue;
        }

        const conversation = await getOrCreateConversation(client, {
          phone_number_id: normalized.phoneNumberId,
          contact_phone: normalized.contactPhone,
        });

        const conversationKey = `${conversation.phone_number_id}:${conversation.contact_phone}`;
        if (!seenConversationKeys.has(conversationKey)) {
          seenConversationKeys.add(conversationKey);
          if (conversation.created_at === conversation.updated_at) {
            createdConversations += 1;
          }
        }

        if (direction === "inbound") {
          const result = await upsertInboundMessage(client, {
            conversation_id: conversation.id,
            tyxter_message_id: message.id,
            author_type: "customer",
            message_type: normalized.messageType,
            text_body: normalized.textBody,
            media_kind: normalized.mediaKind,
            payload: normalized.payload,
            metadata: normalized.metadata,
            status: message.status ?? "received",
            occurred_at: normalized.occurredAt,
          });

          if (result.inserted) {
            importedMessages += 1;
          } else {
            skippedDuplicates += 1;
          }
        } else {
          const result = await upsertOutboundMessage(client, {
            conversation_id: conversation.id,
            tyxter_message_id: message.id,
            author_type: inferAuthorType(normalized.metadata),
            message_type: normalized.messageType,
            text_body: normalized.textBody,
            media_kind: normalized.mediaKind,
            payload: normalized.payload,
            metadata: normalized.metadata,
            status: message.status ?? "sent",
            occurred_at: normalized.occurredAt,
          });

          if (result.inserted) {
            importedMessages += 1;
          } else {
            skippedDuplicates += 1;
          }
        }
      }

      cursor = page.has_more ? page.next_cursor ?? null : null;
    } while (cursor);
  }

  return { importedMessages, createdConversations, skippedDuplicates };
}
