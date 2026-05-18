import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { deleteRetailerRecoveryRecord, listRetailerRecoveryRecords } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const deleted = await listRetailerRecoveryRecords(250);
  const rows = await Promise.all(
    deleted.map(async (u) => {
      const client = u.clientId ? await getClientKeyRecordById(u.clientId) : null;
      const remaining =
        typeof u.remainingTryOns === "number"
          ? u.remainingTryOns
          : client
            ? Math.max(0, client.usageLimit - client.usageCount)
            : null;
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

type DeleteBody = {
  userId?: unknown;
};

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) return Response.json({ error: "userId is required." }, { status: 400 });

  try {
    await deleteRetailerRecoveryRecord(userId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to delete recovery record." },
      { status: 400 },
    );
  }
}

