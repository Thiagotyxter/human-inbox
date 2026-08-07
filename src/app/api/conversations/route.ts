import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/user";
import { listConversations } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseAdminClient();
    const conversations = await listConversations(supabase);
    return NextResponse.json({ data: conversations });
  } catch (error) {
    return jsonError(error);
  }
}
