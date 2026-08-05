import { NextResponse } from "next/server";

import { markConversationRead } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const supabase = createSupabaseAdminClient();
    const { conversationId } = await context.params;
    await markConversationRead(supabase, conversationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
