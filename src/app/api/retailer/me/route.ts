import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getRetailerSessionUser, toPublicRetailer } from "@/lib/retailerAuth";

export const runtime = "nodejs";

/** Session check + dashboard payload (no Fashn secret). */
export async function GET() {
  const user = await getRetailerSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const client = user.clientId ? await getClientKeyRecordById(user.clientId) : null;
  if (user.clientId && !client) {
    return Response.json(
      { error: "Account data is incomplete. Contact support.", user: toPublicRetailer(user) },
      { status: 500 },
    );
  }

  if (!client) {
    return Response.json({
      user: toPublicRetailer(user),
      client: null,
    });
  }

  const { fashnApiKey: _f, ...clientSafe } = client;
  void _f;

  return Response.json({
    user: toPublicRetailer(user),
    client: clientSafe,
  });
}
