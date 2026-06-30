import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { listRetailerAccountsForAdmin } from "@/lib/retailerAdminList";
import { getRetailerInternalDemoMap } from "@/lib/retailerInternalDemo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message, retailers: [] }, { status });
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return jsonError("Unauthorized.", 401);
    }

    const retailers = await listRetailerAccountsForAdmin();
    const internalDemoMap = await getRetailerInternalDemoMap(retailers.map((r) => r.userId));
    const enriched = retailers.map((r) => ({
      ...r,
      isInternalDemo: internalDemoMap[r.userId] ?? false,
    }));
    return Response.json({ retailers: enriched });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load retailers.";
    console.error("[fit-room][admin-retailers] GET failed", {
      message,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return jsonError(message, 503);
  }
}
