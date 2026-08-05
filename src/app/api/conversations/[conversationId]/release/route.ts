import { NextResponse } from "next/server";

import { releaseConversation } from "@/lib/conversations/handoff";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const supabase = createSupabaseAdminClient();
    const { conversationId } = await context.params;
    const conversation = await releaseConversation(supabase, conversationId, null);
    return NextResponse.json({ data: conversation });
  } catch (error) {
    return jsonError(error);
  }
}
