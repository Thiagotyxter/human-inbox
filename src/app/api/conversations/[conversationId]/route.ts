import { NextResponse } from "next/server";

import { getConversationWithMessages } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const supabase = createSupabaseAdminClient();
    const { conversationId } = await context.params;
    const conversation = await getConversationWithMessages(supabase, conversationId);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    return jsonError(error);
  }
}
