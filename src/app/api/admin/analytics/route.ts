import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getPlatformAnalyticsSummary } from "@/lib/platformAnalytics";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const summary = await getPlatformAnalyticsSummary();
  return Response.json(summary);
}
