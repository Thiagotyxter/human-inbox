import { NextResponse } from "next/server";
import { z } from "zod";

import { syncTyxterMessages } from "@/lib/conversations/tyxter-sync";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveTargetPhoneNumberId } from "@/lib/tyxter/phone-numbers";

const bodySchema = z
  .object({
    phoneNumberId: z.string().min(1).optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json().catch(() => undefined));
    const phoneNumberId = await resolveTargetPhoneNumberId(body?.phoneNumberId ?? null);
    const admin = createSupabaseAdminClient();
    const summary = await syncTyxterMessages(admin, { phoneNumberId });

    return NextResponse.json({
      imported_messages: summary.importedMessages,
      conversations_created: summary.createdConversations,
      duplicate_messages_skipped: summary.skippedDuplicates,
      phone_number_id: phoneNumberId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    return jsonError(error);
  }
}
