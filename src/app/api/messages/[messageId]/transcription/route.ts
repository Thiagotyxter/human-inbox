import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/user";
import { getMessageById, updateMessageTranscription } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTyxterMessageTranscription, requestTyxterMessageTranscription } from "@/lib/tyxter/messages";
import type { TyxterMessageTranscription } from "@/lib/tyxter/types";

function normalize(result: TyxterMessageTranscription) {
  const data = result.data ?? result;
  const status: "pending" | "succeeded" | "failed" = data.status === "succeeded" || data.status === "failed" ? data.status : "pending";
  const error = typeof data.error === "string" ? data.error : data.error?.message ?? null;
  return { status, transcript: data.text ?? data.transcript ?? null, error };
}

async function localMessage(messageId: string) {
  const admin = createSupabaseAdminClient();
  const message = await getMessageById(admin, messageId);
  if (!message?.tyxter_message_id || message.direction !== "inbound" || message.media_kind !== "audio") return null;
  return { admin, message, tyxterMessageId: message.tyxter_message_id };
}

export async function POST(_: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await context.params;
    const local = await localMessage(messageId);
    if (!local) return NextResponse.json({ error: "Audio inbound nao encontrado." }, { status: 404 });

    const result = normalize(await requestTyxterMessageTranscription(local.tyxterMessageId));
    await updateMessageTranscription(local.admin, local.tyxterMessageId, result);
    return NextResponse.json({ data: result }, { status: result.status === "pending" ? 202 : 200 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(_: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await context.params;
    const local = await localMessage(messageId);
    if (!local) return NextResponse.json({ error: "Audio inbound nao encontrado." }, { status: 404 });

    const result = normalize(await getTyxterMessageTranscription(local.tyxterMessageId));
    await updateMessageTranscription(local.admin, local.tyxterMessageId, result);
    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
