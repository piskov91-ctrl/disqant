import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getTryOnTimingForClient, getWearMeRetailDashboardStats } from "@/lib/platformAnalytics";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { getAllTryOnProducts, productDisplayName } from "@/lib/tryOnAnalytics";

export const runtime = "nodejs";

export async function GET() {
  const user = await getRetailerSessionUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const client = user.clientId ? await getClientKeyRecordById(user.clientId) : null;
  if (!client) {
    return Response.json(
      { error: "No active plan. Choose a subscription to get an API key." },
      { status: 403 },
    );
  }

  const [timing, products, wearMe] = await Promise.all([
    getTryOnTimingForClient(client.id),
    getAllTryOnProducts(client.id, 2000),
    getWearMeRetailDashboardStats(client.id),
  ]);

  return Response.json({
    tryOnByHourUtc: timing.tryOnByHourUtc,
    tryOnByWeekdayUtc: timing.tryOnByWeekdayUtc,
    wearMe,
    products: products.map((p) => ({
      productImageUrl: p.productImageUrl,
      displayName: productDisplayName(p.productImageUrl),
      tryOnCount: p.tryOnCount,
    })),
  });
}
