import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { createClientKey } from "@/lib/apiKeyStore";
import {
  getRetailerById,
  linkRetailerToClientId,
  retailerAdminSubscriptionStatusLabel,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type CreateKeyBody = {
  retailerUserId?: unknown;
  usageLimit?: unknown;
  fashnApiKey?: unknown;
};

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CreateKeyBody;
  try {
    body = (await req.json()) as CreateKeyBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const retailerUserId = typeof body.retailerUserId === "string" ? body.retailerUserId.trim() : "";
  const fashnApiKey = typeof body.fashnApiKey === "string" ? body.fashnApiKey : "";
  const usageLimitNum =
    typeof body.usageLimit === "number"
      ? body.usageLimit
      : typeof body.usageLimit === "string"
        ? Number(body.usageLimit)
        : NaN;

  if (!retailerUserId) {
    return Response.json({ error: "Retailer user id is required." }, { status: 400 });
  }

  const user = await getRetailerById(retailerUserId);
  if (!user) {
    return Response.json({ error: "Retailer account not found." }, { status: 404 });
  }

  if (user.clientId?.trim()) {
    return Response.json(
      { error: "This retailer already has an API key assigned. Use the Clients tab to manage it." },
      { status: 409 },
    );
  }

  const storeName = user.storeName.trim() || user.companyName.trim();
  if (!storeName) {
    return Response.json({ error: "Retailer has no store name on file." }, { status: 400 });
  }

  try {
    const rec = await createClientKey({
      clientName: storeName,
      contactEmail: user.email,
      usageLimit: usageLimitNum,
      fashnApiKey,
    });
    await linkRetailerToClientId(user.id, rec.id);

    const { fashnApiKey: rawFashn, ...key } = rec;
    void rawFashn;

    const updatedUser = await getRetailerById(user.id);
    const retailerRow = updatedUser
      ? {
          userId: updatedUser.id,
          storeName: updatedUser.storeName.trim() || updatedUser.companyName.trim() || "—",
          email: updatedUser.email.trim(),
          createdAt: updatedUser.createdAt,
          clientId: updatedUser.clientId?.trim() || null,
          subscriptionStatus: retailerAdminSubscriptionStatusLabel(updatedUser),
        }
      : null;

    return Response.json({ ok: true, key, retailer: retailerRow });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to create and assign API key." },
      { status: 400 },
    );
  }
}
