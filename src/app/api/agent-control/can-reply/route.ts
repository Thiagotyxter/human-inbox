import { NextResponse } from "next/server";
import { z } from "zod";

import { canAgentReply } from "@/lib/conversations/can-agent-reply";
import { env, requireAgentControlSharedSecret } from "@/lib/env";
import { jsonError } from "@/lib/http";

const querySchema = z.object({
  phone_number_id: z.string().trim().min(1, "phone_number_id is required."),
  contact_phone: z.string().trim().min(1, "contact_phone is required."),
});

function isAuthorized(request: Request) {
  if (!env.AGENT_CONTROL_SHARED_SECRET) {
    throw new Error("AGENT_CONTROL_SHARED_SECRET is required.");
  }

  const expected = requireAgentControlSharedSecret();
  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-agent-control-secret");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length).trim() : null;

  return token === expected || headerSecret === expected;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = querySchema.parse({
      phone_number_id: url.searchParams.get("phone_number_id"),
      contact_phone: url.searchParams.get("contact_phone"),
    });

    const allowed = await canAgentReply(query.phone_number_id, query.contact_phone);

    return NextResponse.json({
      data: {
        can_agent_reply: allowed,
        mode: allowed ? "agent" : "human",
        phone_number_id: query.phone_number_id,
        contact_phone: query.contact_phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid query." }, { status: 400 });
    }

    return jsonError(error);
  }
}
