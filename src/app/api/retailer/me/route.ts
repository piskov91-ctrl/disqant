import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getRetailerSessionUser, toPublicRetailer } from "@/lib/retailerAuth";

export const runtime = "nodejs";

/** Session check + dashboard payload (no Fashn secret). */
export async function GET() {
  const user = await getRetailerSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const client = await getClientKeyRecordById(user.clientId);
  if (!client) {
    return Response.json(
      { error: "Account data is incomplete. Contact support.", user: toPublicRetailer(user) },
      { status: 500 },
    );
  }

  const { fashnApiKey: _f, ...clientSafe } = client;
  void _f;

  return Response.json({
    user: toPublicRetailer(user),
    client: clientSafe,
  });
}
