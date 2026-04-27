import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getTryOnTimingForClient } from "@/lib/platformAnalytics";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { getAllTryOnProducts, productDisplayName } from "@/lib/tryOnAnalytics";

export const runtime = "nodejs";

export async function GET() {
  const user = await getRetailerSessionUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const client = await getClientKeyRecordById(user.clientId);
  if (!client) {
    return Response.json({ error: "Account data is incomplete." }, { status: 500 });
  }

  const [{ tryOnByHourUtc }, products] = await Promise.all([
    getTryOnTimingForClient(client.id),
    getAllTryOnProducts(client.id, 2000),
  ]);

  return Response.json({
    tryOnByHourUtc,
    products: products.map((p) => ({
      productImageUrl: p.productImageUrl,
      displayName: productDisplayName(p.productImageUrl),
      tryOnCount: p.tryOnCount,
    })),
  });
}
