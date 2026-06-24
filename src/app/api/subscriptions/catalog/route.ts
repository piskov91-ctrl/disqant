import {
  defaultStoredSubscriptionPlanCatalog,
  getStoredSubscriptionPlanCatalog,
} from "@/lib/subscriptionPlanCatalogStore";
import { getSubscriptionPlansCatalog } from "@/lib/subscriptionPlansServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public read of the effective subscription catalog (prices and try-on limits). */
export async function GET() {
  try {
    const catalog = await getSubscriptionPlansCatalog();
    const stored = (await getStoredSubscriptionPlanCatalog()) ?? defaultStoredSubscriptionPlanCatalog();
    return Response.json({
      catalog,
      costPerTryOnGbp: stored.costPerTryOnGbp,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load subscription catalog.";
    return Response.json({ error: message }, { status: 503 });
  }
}
