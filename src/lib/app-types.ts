export type ConversationMode = "agent" | "human";
export type MessageDirection = "inbound" | "outbound";
export type MessageAuthorType = "customer" | "agent" | "human" | "system";

export interface Profile {
  id: string;
  name: string | null;
  created_at: string;
}

export interface ConversationRecord {
  id: string;
  phone_number_id: string;
  contact_phone: string;
  contact_name: string | null;
  mode: ConversationMode;
  assigned_operator_id: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  tyxter_message_id: string | null;
  direction: MessageDirection;
  author_type: MessageAuthorType;
  operator_id: string | null;
  message_type: string;
  text_body: string | null;
  media_kind: string | null;
  media_asset_id: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  media_caption: string | null;
  transcript: string | null;
  transcription_status: "pending" | "succeeded" | "failed" | null;
  transcription_error: string | null;
  payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
  occurred_at: string;
  created_at: string;
}

export interface ConversationEventRecord {
  id: string;
  conversation_id: string;
  event_type: string;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversationWithMessages extends ConversationRecord {
  assigned_operator?: Profile | null;
  messages: MessageRecord[];
}

export interface PhoneNumberOption {
  id: string;
  label: string;
  status: string | null;
  display_phone_number: string | null;
}
