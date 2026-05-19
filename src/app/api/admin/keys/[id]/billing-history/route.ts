import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getNextMonthlyResetUtcDateForDisplay } from "@/lib/billingCycle";
import { getClientBillingHistory, getClientKeyRecordById } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const rec = await getClientKeyRecordById(id);
  if (!rec || rec.deletedAt) {
    return Response.json({ error: "Client key not found." }, { status: 404 });
  }

  const { topUps, resets } = await getClientBillingHistory(id);
  const nextReset = getNextMonthlyResetUtcDateForDisplay(rec, new Date());

  return Response.json({
    subscriptionStartedAt: rec.createdAt,
    nextResetAt: nextReset.toISOString(),
    billingAnchorDay: rec.billingAnchorDay ?? null,
    topUps,
    resets,
  });
}
