import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-compat";
import { isPlainPostgres } from "@/lib/db/mode";
import { verifyAccessToken } from "@/lib/db/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PG_IDENT = /^[a-z_][a-z0-9_]*$/i;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ fn: string }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ message: "DATABASE_URL not set" }, { status: 503 });
  }
  const { fn } = await ctx.params;
  if (!PG_IDENT.test(fn)) {
    return NextResponse.json({ message: "Invalid function name" }, { status: 400 });
  }

  const allowed = new Set(["mark_order_paid", "upsert_customer_from_order"]);
  if (!allowed.has(fn)) {
    return NextResponse.json({ message: "Function not exposed" }, { status: 404 });
  }
  if (fn === "mark_order_paid") {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const verified = token ? await verifyAccessToken(token) : null;
    const role = verified
      ? String((verified.payload.app_metadata as { role?: string } | undefined)?.role || "")
      : "";
    if (role !== "admin" && role !== "staff") {
      return NextResponse.json({ message: "Not allowed" }, { status: 403 });
    }
  }

  const args = (await req.json().catch(() => ({}))) as Record<string, any>;
  const client = createClient();
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    return NextResponse.json(
      { message: error.message, code: "PGRST202" },
      { status: 400 }
    );
  }
  return NextResponse.json(data);
}
