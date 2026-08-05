import { NextResponse } from "next/server";

import { listConversations } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const conversations = await listConversations(supabase);
    return NextResponse.json({ data: conversations });
  } catch (error) {
    return jsonError(error);
  }
}
