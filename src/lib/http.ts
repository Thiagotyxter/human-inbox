import { NextResponse } from "next/server";

import { TyxterApiError } from "@/lib/tyxter/types";

export function jsonError(error: unknown, fallbackMessage = "Unexpected error", fallbackStatus = 500) {
  if (error instanceof TyxterApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        traceId: error.traceId,
      },
      { status: error.status },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: fallbackStatus });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}
