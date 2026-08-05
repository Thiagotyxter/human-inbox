import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processTyxterWebhook } from "@/lib/conversations/tyxter-events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TyxterWebhookEnvelope } from "@/lib/tyxter/types";
import { verifyWebhookSignature } from "@/lib/tyxter/webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookId = request.headers.get("tyxter-webhook-id");
  const timestamp = request.headers.get("tyxter-webhook-timestamp");
  const signature = request.headers.get("tyxter-webhook-signature");

  if (env.TYXTER_WEBHOOK_SIGNING_SECRET) {
    if (!webhookId || !timestamp || !signature) {
      return NextResponse.json({ error: "Missing webhook signature headers." }, { status: 401 });
    }

    const isValid = verifyWebhookSignature({
      secret: env.TYXTER_WEBHOOK_SIGNING_SECRET,
      timestamp,
      rawBody,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  } else if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "TYXTER_WEBHOOK_SIGNING_SECRET is required in production." }, { status: 401 });
  }

  const envelope = JSON.parse(rawBody) as TyxterWebhookEnvelope;
  const admin = createSupabaseAdminClient();
  await processTyxterWebhook(admin, envelope);

  return NextResponse.json({ ok: true });
}
