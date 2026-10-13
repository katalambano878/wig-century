import { NextRequest, NextResponse } from "next/server";
import { createStorageClient, verifyObjectToken } from "@/lib/db/storage";
import { isPlainPostgres } from "@/lib/db/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cors(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-upsert, cache-control, x-client-info",
    "Access-Control-Allow-Methods": "PUT,POST,OPTIONS",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

async function acceptUpload(req: NextRequest, bucket: string, objectPath: string) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const exp = Number(req.nextUrl.searchParams.get("exp") || "0");
  if (!verifyObjectToken(bucket, objectPath, exp, token)) {
    return NextResponse.json({ error: "Invalid or expired upload token" }, { status: 403, headers: cors() });
  }
  const contentType = req.headers.get("content-type") || "application/octet-stream";
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 50 MB" }, { status: 413, headers: cors() });
  }
  const storage = createStorageClient();
  const { error } = await storage.from(bucket).upload(objectPath, buf, {
    contentType,
    upsert: true,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: cors() });
  }
  const { data: pub } = storage.from(bucket).getPublicUrl(objectPath);
  return NextResponse.json({ Key: `${bucket}/${objectPath}`, publicUrl: pub.publicUrl }, { headers: cors() });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }
  const { bucket, path } = await ctx.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  return acceptUpload(req, bucket, objectPath);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }
  const { bucket, path } = await ctx.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  return acceptUpload(req, bucket, objectPath);
}
