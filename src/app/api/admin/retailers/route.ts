import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { listActiveRetailerAccountsForAdmin } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const retailers = await listActiveRetailerAccountsForAdmin();
    return Response.json({ retailers });
  } catch (e) {
    console.error("[fit-room][admin-retailers] list failed", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load retailers." },
      { status: 503 },
    );
  }
}
