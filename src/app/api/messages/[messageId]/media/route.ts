import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/user";
import { getMessageById } from "@/lib/conversations/repository";
import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createTyxterMediaDownloadUrl, fetchTyxterMedia } from "@/lib/tyxter/messages";
import { extractMediaAssetId } from "@/lib/conversations/service";

export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await context.params;
    const admin = createSupabaseAdminClient();
    const message = await getMessageById(admin, messageId);

    const assetId = message ? message.media_asset_id ?? extractMediaAssetId(message.payload) : null;

    if (!assetId) {
      return NextResponse.json({ error: "Mensagem sem asset de midia da Tyxter." }, { status: 404 });
    }

    const mediaUrl = await createTyxterMediaDownloadUrl(assetId);
    const upstream = await fetchTyxterMedia(mediaUrl, request.headers.get("range"));

    if (!upstream.ok) {
      return NextResponse.json({ error: "Nao foi possivel obter a midia da Tyxter." }, { status: upstream.status });
    }

    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? message?.media_mime_type ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
    });
    for (const name of ["content-length", "content-range", "content-disposition"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return jsonError(error);
  }
}
