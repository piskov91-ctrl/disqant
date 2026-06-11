import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { listRetailerAccountsForAdmin } from "@/lib/retailerAdminList";
import { getCustomTryOnAccessMap, setCustomTryOnAccess } from "@/lib/customTryOnAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized.", accounts: [] }, { status: 401 });
  }

  try {
    const retailers = await listRetailerAccountsForAdmin();
    const accessMap = await getCustomTryOnAccessMap(retailers.map((r) => r.userId));
    const accounts = retailers.map((r) => ({
      userId: r.userId,
      email: r.email,
      storeName: r.storeName,
      enabled: accessMap[r.userId] ?? false,
    }));
    return Response.json({ accounts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load accounts.";
    return Response.json({ error: message, accounts: [] }, { status: 503 });
  }
}

type PostBody = {
  userId?: unknown;
  enabled?: unknown;
};

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const enabled = body.enabled === true;
  if (!userId) {
    return Response.json({ error: "userId is required." }, { status: 400 });
  }

  try {
    await setCustomTryOnAccess(userId, enabled);
    return Response.json({ ok: true, userId, enabled });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to update access." },
      { status: 400 },
    );
  }
}
