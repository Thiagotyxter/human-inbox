import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/user";
import { jsonError } from "@/lib/http";
import { getPhoneNumberOptions } from "@/lib/tyxter/phone-numbers";

export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const phoneNumbers = await getPhoneNumberOptions();
    return NextResponse.json({ data: phoneNumbers });
  } catch (error) {
    return jsonError(error);
  }
}
