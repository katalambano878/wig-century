import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  applyPostgrestParams,
} from "@/lib/db/supabase-compat";
import { isPlainPostgres } from "@/lib/db/mode";
import { restWriteAllowed } from "@/lib/db/rest-guard";
import { verifyAccessToken } from "@/lib/db/auth";

async function addressFilterMatchesUser(req: NextRequest): Promise<NextResponse | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const verified = token ? await verifyAccessToken(token) : null;
  const role = verified
    ? String((verified.payload.app_metadata as { role?: string } | undefined)?.role || "")
    : "";
  if (role === "admin" || role === "staff") return null;
  const filter = req.nextUrl.searchParams.get("user_id") || "";
  if (!verified || filter !== `eq.${verified.userId}`) {
    return jsonError("Not allowed", 403);
  }
  return null;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PG_IDENT = /^[a-z_][a-z0-9_]*$/i;

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, prefer, x-client-info, accept-profile, content-profile",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
}

function preferSingle(req: NextRequest): boolean {
  const accept = req.headers.get("accept") || "";
  return accept.includes("application/vnd.pgrst.object+json");
}

function preferReturn(req: NextRequest): boolean {
  const prefer = req.headers.get("prefer") || "";
  return prefer.includes("return=representation") || prefer.includes("resolution=");
}

function preferCount(req: NextRequest): boolean {
  const prefer = req.headers.get("prefer") || "";
  return prefer.includes("count=exact");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { message, code: "PGRST", details: null, hint: null },
    { status, headers: corsHeaders() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");

  const client = createClient();
  const qb = client.from(table);
  const select = req.nextUrl.searchParams.get("select") || "*";
  if (preferCount(req)) {
    qb.select(select, {
      count: "exact",
      head: req.headers.get("prefer")?.includes("head=true"),
    });
  } else {
    qb.select(select);
  }
  // Apply filters/order/limit without re-applying select
  const params = new URLSearchParams(req.nextUrl.searchParams);
  params.delete("select");
  applyPostgrestParams(qb as any, params, {
    preferSingle: preferSingle(req),
  });

  const result = await qb;
  if (result.error) {
    return jsonError(result.error.message || "Query failed", 400);
  }

  const headers = new Headers(corsHeaders());
  headers.set("Content-Type", "application/json");
  if (result.count != null) {
    headers.set("Content-Range", `0-${Math.max((Array.isArray(result.data) ? result.data.length : 1) - 1, 0)}/${result.count}`);
  }

  if (preferSingle(req)) {
    return NextResponse.json(result.data, { status: 200, headers });
  }
  return NextResponse.json(result.data ?? [], { status: 200, headers });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");
  const gate = await restWriteAllowed("POST", table, req.headers.get("authorization"));
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const body = await req.json().catch(() => null);
  if (body == null) return jsonError("Invalid JSON body");
  if (table === "addresses") {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { verifyAccessToken } = await import("@/lib/db/auth");
    const verified = token ? await verifyAccessToken(token) : null;
    const role = verified
      ? String((verified.payload.app_metadata as { role?: string } | undefined)?.role || "")
      : "";
    if (role !== "admin" && role !== "staff") {
      if (!verified) return jsonError("Not allowed", 401);
      const stamp = (row: Record<string, unknown>) => ({ ...row, user_id: verified.userId });
      if (Array.isArray(body)) {
        for (const row of body) Object.assign(row, stamp(row));
      } else if (typeof body === "object") {
        Object.assign(body, stamp(body as Record<string, unknown>));
      }
    }
  }
  if (body == null) return jsonError("Invalid JSON body");

  const client = createClient();
  let qb = client.from(table).insert(body);
  if (preferReturn(req) || preferSingle(req)) {
    qb = qb.select("*") as typeof qb;
  }
  if (preferSingle(req)) qb = qb.single() as typeof qb;

  const result = await qb;
  if (result.error) return jsonError(result.error.message || "Insert failed", 400);

  return NextResponse.json(result.data, {
    status: 201,
    headers: corsHeaders(),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");
  const gate = await restWriteAllowed("PATCH", table, req.headers.get("authorization"));
  if (!gate.ok) return jsonError(gate.message, gate.status);
  if (table === "addresses") {
    const denied = await addressFilterMatchesUser(req);
    if (denied) return denied;
  }

  const body = await req.json().catch(() => null);
  if (body == null || typeof body !== "object") return jsonError("Invalid JSON body");

  const client = createClient();
  let qb = client.from(table).update(body);
  applyPostgrestParams(qb as any, req.nextUrl.searchParams);
  if (preferReturn(req) || preferSingle(req)) {
    qb = qb.select("*") as typeof qb;
  }
  if (preferSingle(req)) qb = qb.single() as typeof qb;

  const result = await qb;
  if (result.error) return jsonError(result.error.message || "Update failed", 400);

  return NextResponse.json(result.data, { status: 200, headers: corsHeaders() });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");
  const gate = await restWriteAllowed("DELETE", table, req.headers.get("authorization"));
  if (!gate.ok) return jsonError(gate.message, gate.status);
  if (table === "addresses") {
    const denied = await addressFilterMatchesUser(req);
    if (denied) return denied;
  }

  const client = createClient();
  let qb = client.from(table).delete();
  applyPostgrestParams(qb as any, req.nextUrl.searchParams);
  if (preferReturn(req)) {
    qb = qb.select("*") as typeof qb;
  }

  const result = await qb;
  if (result.error) return jsonError(result.error.message || "Delete failed", 400);

  return NextResponse.json(result.data ?? null, { status: 200, headers: corsHeaders() });
}
