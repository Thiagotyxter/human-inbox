export interface TyxterApiErrorPayload {
  type?: string;
  code?: string;
  message?: string;
  details?: unknown;
  request_id?: string;
  trace_id?: string;
}

export class TyxterApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  traceId?: string;
  requestId?: string;

  constructor(message: string, options: { status: number; code?: string; details?: unknown; traceId?: string; requestId?: string }) {
    super(message);
    this.name = "TyxterApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.traceId = options.traceId;
    this.requestId = options.requestId;
  }
}

export interface TyxterListResponse<T> {
  object: string;
  data: T[];
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface TyxterIdentity {
  type?: string;
  id?: string;
  country_calling_code?: string;
  national_number?: string;
}

export interface TyxterMessage {
  id: string;
  status?: string | null;
  channel?: string;
  environment?: string;
  created_at?: string;
  updated_at?: string;
  occurred_at?: string;
  sender?: TyxterIdentity | null;
  recipient?: TyxterIdentity | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  provider_error?: Record<string, unknown> | null;
}

export interface TyxterMediaDownloadCapability {
  url?: string;
  download_url?: string;
  expires_at?: string;
  data?: {
    url?: string;
    download_url?: string;
    expires_at?: string;
  };
}

export interface TyxterMessageTranscription {
  status: "pending" | "succeeded" | "failed";
  text?: string | null;
  transcript?: string | null;
  error?: string | { message?: string } | null;
  data?: {
    status?: "pending" | "succeeded" | "failed";
    text?: string | null;
    transcript?: string | null;
    error?: string | { message?: string } | null;
  };
}

export interface TyxterPhoneNumber {
  id: string;
  status?: string | null;
  display_phone_number?: string | null;
  phone_number?: string | null;
  connected_at?: string | null;
  quality_rating?: string | null;
  messaging_tier?: string | null;
  meta_phone_number_id?: string | null;
}

export interface TyxterWebhookEnvelope {
  id?: string;
  type: string;
  created_at?: string;
  occurred_at?: string;
  data?: Record<string, unknown>;
  payload?: {
    id?: string;
    type?: string;
    created_at?: string;
    occurred_at?: string;
    data?: Record<string, unknown>;
  };
}
