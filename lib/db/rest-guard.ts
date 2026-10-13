import { verifyAccessToken } from "./auth";

const GUEST_INSERT = new Set(["orders", "order_items", "contact_submissions"]);
const CUSTOMER_INSERT = new Set(["reviews", "review_images"]);

export async function restWriteAllowed(
  method: string,
  table: string,
  authorization: string | null
): Promise<{ ok: boolean; status: number; message: string }> {
  const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  const verified = token ? await verifyAccessToken(token) : null;
  const role = verified
    ? String((verified.payload.app_metadata as { role?: string } | undefined)?.role || "")
    : "";
  const staff = role === "admin" || role === "staff";

  if (staff) return { ok: true, status: 200, message: "" };

  if (method === "POST" && !verified && GUEST_INSERT.has(table)) {
    return { ok: true, status: 200, message: "" };
  }
  if (method === "POST" && verified && CUSTOMER_INSERT.has(table)) {
    return { ok: true, status: 200, message: "" };
  }

  return {
    ok: false,
    status: verified ? 403 : 401,
    message: "Not allowed",
  };
}
