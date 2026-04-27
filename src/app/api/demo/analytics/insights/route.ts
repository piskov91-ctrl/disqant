import { getClientByApiKey, listClientKeys } from "@/lib/apiKeyStore";
import { getGlobalTryOnTiming } from "@/lib/platformAnalytics";
import { getAllTryOnProducts, productDisplayName } from "@/lib/tryOnAnalytics";

export const runtime = "nodejs";

/** Same billing client as <code>/api/tryon</code> when no integrator key is sent (demo / fallback). */
async function resolveDemoBillingClientId(): Promise<string | null> {
  const envKey = process.env.DISQUANT_DEMO_TEST_CLIENT_KEY?.trim();
  if (envKey) {
    const rec = await getClientByApiKey(envKey);
    if (rec) return rec.id;
  }
  const keys = await listClientKeys();
  return keys[0]?.id ?? null;
}

export async function GET() {
  const clientId = await resolveDemoBillingClientId();
  if (!clientId) {
    return Response.json({ error: "No billing client configured." }, { status: 503 });
  }

  const [{ tryOnByHourUtc }, products] = await Promise.all([
    getGlobalTryOnTiming(),
    getAllTryOnProducts(clientId, 2000),
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
