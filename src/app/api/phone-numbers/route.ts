import { NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import { getPhoneNumberOptions } from "@/lib/tyxter/phone-numbers";

export async function GET() {
  try {
    const phoneNumbers = await getPhoneNumberOptions();
    return NextResponse.json({ data: phoneNumbers });
  } catch (error) {
    return jsonError(error);
  }
}
