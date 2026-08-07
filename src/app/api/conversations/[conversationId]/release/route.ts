import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/user";
import { releaseConversation } from "@/lib/conversations/handoff";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseAdminClient();
    const { conversationId } = await context.params;
    const conversation = await releaseConversation(supabase, conversationId, user.id);
    return NextResponse.json({ data: conversation });
  } catch (error) {
    return jsonError(error);
  }
}
