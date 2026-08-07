import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth/user";
import { getConversation, upsertOutboundMessage } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTyxterTextMessage } from "@/lib/tyxter/messages";

const bodySchema = z.object({
  text: z.string().trim().min(1, "Texto obrigatorio."),
});

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseAdminClient();
    const body = bodySchema.parse(await request.json());
    const { conversationId } = await context.params;
    const conversation = await getConversation(supabase, conversationId);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.mode !== "human") {
      return NextResponse.json({ error: "A conversa precisa estar em modo humano para envio manual." }, { status: 409 });
    }

    const sentMessage = await sendTyxterTextMessage({
      senderPhoneNumberId: conversation.phone_number_id,
      recipientPhone: conversation.contact_phone,
      text: body.text,
      metadata: {
        source: "human_inbox",
      },
    });

    await upsertOutboundMessage(supabase, {
      conversation_id: conversation.id,
      tyxter_message_id: sentMessage.id,
      author_type: "human",
      operator_id: user.id,
      message_type: "text",
      text_body: body.text,
      media_kind: null,
      payload: sentMessage.payload ?? {
        message: { type: "text", text: { body: body.text } },
      },
      metadata: {
        source: "human_inbox",
      },
      status: sentMessage.status ?? "queued",
      occurred_at: sentMessage.created_at ?? new Date().toISOString(),
    });

    return NextResponse.json({ data: { id: sentMessage.id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Payload invalido." }, { status: 400 });
    }

    return jsonError(error);
  }
}
