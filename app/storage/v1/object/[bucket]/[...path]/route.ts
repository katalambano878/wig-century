import { NextRequest, NextResponse } from "next/server";
import { createStorageClient } from "@/lib/db/storage";
import { isPlainPostgres } from "@/lib/db/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * supabase-js storage.upload() posts multipart/form-data (cacheControl + file).
 * Saving that body as-is stores the form wrapper instead of the image.
 */
function extractUploadedFile(raw: Buffer, contentType: string): { body: Buffer; contentType: string } {
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return { body: raw, contentType: contentType.split(";")[0].trim() || "application/octet-stream" };
  }
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (!boundaryMatch) {
    return { body: raw, contentType: "application/octet-stream" };
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const text = raw.toString("latin1");
  const parts = text.split(`--${boundary}`);
  for (const part of parts) {
    if (!/filename=/i.test(part)) continue;
    const splitAt = part.indexOf("\r\n\r\n");
    if (splitAt === -1) continue;
    const headers = part.slice(0, splitAt);
    let body = part.slice(splitAt + 4);
    if (body.endsWith("\r\n")) body = body.slice(0, -2);
    const fileType = /content-type:\s*([^\r\n;]+)/i.exec(headers)?.[1]?.trim() || "application/octet-stream";
    return { body: Buffer.from(body, "latin1"), contentType: fileType };
  }
  return { body: raw, contentType: "application/octet-stream" };
}

function cors(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-upsert, cache-control, x-client-info",
    "Access-Control-Allow-Methods": "POST,DELETE,OPTIONS",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

/**
 * Supabase Storage upload:
 *   POST /storage/v1/object/{bucket}/{path}
 *   body = raw file bytes
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }

  const { bucket, path } = await ctx.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  const upsert = (req.headers.get("x-upsert") || "").toLowerCase() === "true";
  const contentType =
    req.headers.get("content-type") || "application/octet-stream";

  const raw = Buffer.from(await req.arrayBuffer());
  const extracted = extractUploadedFile(raw, contentType);
  const storage = createStorageClient();
  const { data, error } = await storage.from(bucket).upload(objectPath, extracted.body, {
    contentType: extracted.contentType,
    upsert,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: cors() });
  }

  const { data: pub } = storage.from(bucket).getPublicUrl(objectPath);
  return NextResponse.json(
    {
      Key: `${bucket}/${objectPath}`,
      Id: data?.path,
      ...data,
      publicUrl: pub.publicUrl,
    },
    { headers: cors() }
  );
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }
  const { bucket, path } = await ctx.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  const storage = createStorageClient();
  const { error } = await storage.from(bucket).remove([objectPath]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({});
}
