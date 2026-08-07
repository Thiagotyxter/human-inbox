import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/user";
import { getConversationWithMessages } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
