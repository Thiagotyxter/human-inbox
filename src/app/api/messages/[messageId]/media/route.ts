import { NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import { fetchTyxterMedia, resolveTyxterMessageMediaUrl } from "@/lib/tyxter/messages";

export async function GET(_: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await context.params;
    const mediaUrl = await resolveTyxterMessageMediaUrl(messageId);

    if (!mediaUrl) {
      return NextResponse.json({ error: "Midia nao encontrada ou expirada." }, { status: 404 });
    }

    const upstream = await fetchTyxterMedia(mediaUrl);

    if (upstream.status === 302 || upstream.status === 307) {
      const location = upstream.headers.get("location");

      if (location) {
        return NextResponse.redirect(location);
      }
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: "Nao foi possivel obter a midia da Tyxter." }, { status: upstream.status });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
