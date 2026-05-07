import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { listDeletedRetailerAccounts } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const deleted = await listDeletedRetailerAccounts(250);
  const rows = await Promise.all(
    deleted.map(async (u) => {
      const client = u.clientId ? await getClientKeyRecordById(u.clientId) : null;
      const remaining = client ? Math.max(0, client.usageLimit - client.usageCount) : null;
      const limit = client ? client.usageLimit : null;
      const used = client ? client.usageCount : null;
      return {
        ...u,
        remainingTryOns: remaining,
        usageLimit: limit,
        usageCount: used,
      };
    }),
  );
  return Response.json({ accounts: rows });
}

