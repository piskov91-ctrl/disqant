import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getGlobalTryOnTiming } from "@/lib/platformAnalytics";
import { getAllTryOnProductsAggregated, productDisplayName } from "@/lib/tryOnAnalytics";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const [{ tryOnByHourUtc }, products] = await Promise.all([
    getGlobalTryOnTiming(),
    getAllTryOnProductsAggregated(800),
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
