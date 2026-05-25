import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import {
  adminSetRetailSubscriptionAccessUntilUtc,
  listRetailersLinkedToClientId,
  subscriptionAccessUntilYesterdayUtcIso,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type Body = { clientId?: unknown };

/** QA only: sets linked retailer's subscriptionAccessUntil to end of yesterday (UTC). */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = typeof raw.clientId === "string" ? raw.clientId.trim() : "";
  if (!clientId) {
    return Response.json({ error: "Missing client id." }, { status: 400 });
  }

  const client = await getClientKeyRecordById(clientId);
  if (!client) {
    return Response.json({ error: "Client not found." }, { status: 404 });
  }

  const retailers = await listRetailersLinkedToClientId(clientId);
  if (retailers.length === 0) {
    return Response.json(
      {
        error: "No active retailer dashboard account is linked to this API key (`clientId` on the retailer user).",
      },
      { status: 404 },
    );
  }
  if (retailers.length > 1) {
    return Response.json(
      {
        error:
          "Multiple retailer logins reference this API key. Resolve to a single retailer (or unlink extras), then retry.",
        retailers: retailers.map((r) => ({ userId: r.userId, email: r.email, storeName: r.storeName })),
      },
      { status: 409 },
    );
  }

  const untilIso = subscriptionAccessUntilYesterdayUtcIso();
  try {
    await adminSetRetailSubscriptionAccessUntilUtc(retailers[0].userId, untilIso);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed to update retailer." }, { status: 502 });
  }

  return Response.json({
    ok: true as const,
    retailerUserId: retailers[0].userId,
    retailerEmail: retailers[0].email,
    subscriptionAccessUntil: untilIso,
  });
}
