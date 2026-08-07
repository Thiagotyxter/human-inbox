import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

import type {
  ConversationEventRecord,
  ConversationRecord,
  ConversationWithMessages,
  MessageAuthorType,
  MessageDirection,
  MessageRecord,
  Profile,
} from "@/lib/app-types";
import { buildLastMessagePreview, shouldUpdateMessageStatus } from "@/lib/conversations/service";

type DbClient = SupabaseClient;

async function unwrapSingle<T>(promise: PromiseLike<PostgrestSingleResponse<T>>) {
  const result = await promise;

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function unwrapMany<T>(promise: PromiseLike<{ data: T[] | null; error: Error | null }>) {
  const result = await promise;

  if (result.error) {
    throw result.error;
  }

  return result.data ?? [];
}

export async function ensureProfile(client: DbClient, user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? null;
  const { error } = await client.from("profiles").upsert({ id: user.id, name }, { onConflict: "id" });

  if (error) {
    throw error;
  }
}

export async function listConversations(client: DbClient) {
  return unwrapMany<ConversationRecord>(
    client
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false }),
  );
}

export async function getConversation(client: DbClient, conversationId: string) {
  return unwrapSingle<ConversationRecord | null>(
    client.from("conversations").select("*").eq("id", conversationId).maybeSingle(),
  );
}

export async function getConversationByPhone(client: DbClient, phoneNumberId: string, contactPhone: string) {
  return unwrapSingle<ConversationRecord | null>(
    client
      .from("conversations")
      .select("*")
      .eq("phone_number_id", phoneNumberId)
      .eq("contact_phone", contactPhone)
      .maybeSingle(),
  );
}

export async function getMessagesForConversation(client: DbClient, conversationId: string) {
  return unwrapMany<MessageRecord>(
    client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("occurred_at", { ascending: true })
      .order("created_at", { ascending: true }),
  );
}

export async function getConversationWithMessages(client: DbClient, conversationId: string): Promise<ConversationWithMessages | null> {
  const conversation = await getConversation(client, conversationId);

  if (!conversation) {
    return null;
  }

  const [messages, profiles] = await Promise.all([
    getMessagesForConversation(client, conversationId),
    unwrapMany<Profile>(client.from("profiles").select("*")),
  ]);

  return {
    ...conversation,
    assigned_operator: profiles.find((profile) => profile.id === conversation.assigned_operator_id) ?? null,
    messages,
  };
}

export async function createConversation(client: DbClient, values: {
  phone_number_id: string;
  contact_phone: string;
  contact_name?: string | null;
  mode?: "agent" | "human";
}) {
  return unwrapSingle<ConversationRecord>(
    client
      .from("conversations")
      .insert({
        phone_number_id: values.phone_number_id,
        contact_phone: values.contact_phone,
        contact_name: values.contact_name ?? null,
        mode: values.mode ?? "agent",
      })
      .select("*")
      .single(),
  );
}

export async function getOrCreateConversation(
  client: DbClient,
  values: { phone_number_id: string; contact_phone: string; contact_name?: string | null },
) {
  const existing = await getConversationByPhone(client, values.phone_number_id, values.contact_phone);

  if (existing) {
    if (values.contact_name && !existing.contact_name) {
      await client.from("conversations").update({ contact_name: values.contact_name }).eq("id", existing.id);
      return { ...existing, contact_name: values.contact_name };
    }

    return existing;
  }

  return createConversation(client, values);
}

export async function getMessageByTyxterId(client: DbClient, tyxterMessageId: string) {
  return unwrapSingle<MessageRecord | null>(
    client.from("messages").select("*").eq("tyxter_message_id", tyxterMessageId).maybeSingle(),
  );
}

export async function getMessageById(client: DbClient, messageId: string) {
  return unwrapSingle<MessageRecord | null>(
    client.from("messages").select("*").eq("id", messageId).maybeSingle(),
  );
}

export async function insertMessage(
  client: DbClient,
  values: {
    conversation_id: string;
    tyxter_message_id?: string | null;
    direction: MessageDirection;
    author_type: MessageAuthorType;
    operator_id?: string | null;
    message_type: string;
    text_body?: string | null;
    media_kind?: string | null;
    media_asset_id?: string | null;
    media_url?: string | null;
    media_mime_type?: string | null;
    media_filename?: string | null;
    media_caption?: string | null;
    transcript?: string | null;
    transcription_status?: "pending" | "succeeded" | "failed" | null;
    transcription_error?: string | null;
    payload?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    status?: string | null;
    occurred_at: string;
  },
) {
  return unwrapSingle<MessageRecord>(
    client
      .from("messages")
      .insert({
        ...values,
        payload: values.payload ?? null,
        metadata: values.metadata ?? null,
      })
      .select("*")
      .single(),
  );
}

export async function touchConversationAfterMessage(
  client: DbClient,
  params: {
    conversationId: string;
    textBody?: string | null;
    messageType: string;
    mediaKind?: string | null;
    occurredAt: string;
    incrementUnread?: boolean;
  },
) {
  const conversation = await getConversation(client, params.conversationId);

  if (!conversation) {
    throw new Error("Conversation not found while touching state.");
  }

  const nextUnreadCount = params.incrementUnread ? conversation.unread_count + 1 : conversation.unread_count;
  const lastMessagePreview = buildLastMessagePreview(params);

  const { error } = await client
    .from("conversations")
    .update({
      unread_count: nextUnreadCount,
      last_message_at: params.occurredAt,
      last_message_preview: lastMessagePreview,
    })
    .eq("id", params.conversationId);

  if (error) {
    throw error;
  }
}

export async function upsertInboundMessage(
  client: DbClient,
  values: {
    conversation_id: string;
    tyxter_message_id: string;
    author_type: MessageAuthorType;
    message_type: string;
    text_body?: string | null;
    media_kind?: string | null;
    media_asset_id?: string | null;
    media_url?: string | null;
    media_mime_type?: string | null;
    media_filename?: string | null;
    media_caption?: string | null;
    transcript?: string | null;
    transcription_status?: "pending" | "succeeded" | "failed" | null;
    transcription_error?: string | null;
    payload?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    status?: string | null;
    occurred_at: string;
  },
) {
  const existing = await getMessageByTyxterId(client, values.tyxter_message_id);

  if (existing) {
    const update = {
      message_type: values.message_type,
      text_body: values.text_body ?? existing.text_body,
      media_kind: values.media_kind ?? existing.media_kind,
      media_asset_id: values.media_asset_id ?? existing.media_asset_id,
      media_mime_type: values.media_mime_type ?? existing.media_mime_type,
      media_filename: values.media_filename ?? existing.media_filename,
      media_caption: values.media_caption ?? existing.media_caption,
      payload: values.payload ?? existing.payload,
      metadata: values.metadata ?? existing.metadata,
    };
    const { error } = await client.from("messages").update(update).eq("id", existing.id);
    if (error) throw error;
    return { message: { ...existing, ...update }, inserted: false };
  }

  const message = await insertMessage(client, {
    ...values,
    direction: "inbound",
  });

  await touchConversationAfterMessage(client, {
    conversationId: values.conversation_id,
    textBody: values.text_body,
    messageType: values.message_type,
    mediaKind: values.media_kind,
    occurredAt: values.occurred_at,
    incrementUnread: true,
  });

  return { message, inserted: true };
}

export async function upsertOutboundMessage(
  client: DbClient,
  values: {
    conversation_id: string;
    tyxter_message_id: string;
    author_type: MessageAuthorType;
    operator_id?: string | null;
    message_type: string;
    text_body?: string | null;
    media_kind?: string | null;
    media_asset_id?: string | null;
    media_url?: string | null;
    media_mime_type?: string | null;
    media_filename?: string | null;
    media_caption?: string | null;
    transcript?: string | null;
    transcription_status?: "pending" | "succeeded" | "failed" | null;
    transcription_error?: string | null;
    payload?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    status?: string | null;
    occurred_at: string;
  },
) {
  const existing = await getMessageByTyxterId(client, values.tyxter_message_id);

  if (existing) {
    if (shouldUpdateMessageStatus(existing.status, values.status)) {
      const { error } = await client
        .from("messages")
        .update({
          status: values.status,
          metadata: values.metadata ?? existing.metadata,
          payload: values.payload ?? existing.payload,
        })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }
    }

    return { message: existing, inserted: false };
  }

  const message = await insertMessage(client, {
    ...values,
    direction: "outbound",
  });

  await touchConversationAfterMessage(client, {
    conversationId: values.conversation_id,
    textBody: values.text_body,
    messageType: values.message_type,
    mediaKind: values.media_kind,
    occurredAt: values.occurred_at,
    incrementUnread: false,
  });

  return { message, inserted: true };
}

export async function updateMessageStatus(
  client: DbClient,
  tyxterMessageId: string,
  nextStatus: string,
  metadata?: Record<string, unknown> | null,
) {
  const existing = await getMessageByTyxterId(client, tyxterMessageId);

  if (!existing || !shouldUpdateMessageStatus(existing.status, nextStatus)) {
    return existing;
  }

  const nextMetadata =
    metadata === undefined
      ? existing.metadata
      : {
          ...(existing.metadata ?? {}),
          ...metadata,
        };

  const { error } = await client
    .from("messages")
    .update({
      status: nextStatus,
      metadata: nextMetadata,
    })
    .eq("id", existing.id);

  if (error) {
    throw error;
  }

  return { ...existing, status: nextStatus, metadata: nextMetadata };
}

export async function updateMessageTranscription(
  client: DbClient,
  tyxterMessageId: string,
  values: {
    status: "pending" | "succeeded" | "failed";
    transcript?: string | null;
    error?: string | null;
  },
) {
  const existing = await getMessageByTyxterId(client, tyxterMessageId);
  if (!existing) return null;

  const update = {
    transcription_status: values.status,
    transcript: values.transcript ?? existing.transcript,
    transcription_error: values.error ?? null,
  };
  const { error } = await client.from("messages").update(update).eq("id", existing.id);
  if (error) throw error;

  return { ...existing, ...update };
}

export async function setConversationMode(
  client: DbClient,
  params: { conversationId: string; mode: "agent" | "human"; assignedOperatorId: string | null },
) {
  const { error } = await client
    .from("conversations")
    .update({
      mode: params.mode,
      assigned_operator_id: params.assignedOperatorId,
    })
    .eq("id", params.conversationId);

  if (error) {
    throw error;
  }
}

export async function addConversationEvent(
  client: DbClient,
  values: {
    conversation_id: string;
    event_type: string;
    actor_id?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  return unwrapSingle<ConversationEventRecord>(
    client
      .from("conversation_events")
      .insert({
        ...values,
        actor_id: values.actor_id ?? null,
        metadata: values.metadata ?? null,
      })
      .select("*")
      .single(),
  );
}

export async function markConversationRead(client: DbClient, conversationId: string) {
  const { error } = await client.from("conversations").update({ unread_count: 0 }).eq("id", conversationId);

  if (error) {
    throw error;
  }
}

export async function recordProcessedWebhookEvent(client: DbClient, eventId: string, eventType: string) {
  const { error } = await client
    .from("processed_webhook_events")
    .insert({ event_id: eventId, event_type: eventType });

  if (!error) {
    return true;
  }

  if ((error as { code?: string }).code === "23505") {
    return false;
  }

  throw error;
}

export async function canAgentReply(client: DbClient, phoneNumberId: string, contactPhone: string) {
  const conversation = await getConversationByPhone(client, phoneNumberId, contactPhone);

  if (!conversation) {
    return true;
  }

  return conversation.mode === "agent";
}
