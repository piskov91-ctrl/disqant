import { recordDemoPageLoad } from "@/lib/platformAnalytics";

export const runtime = "nodejs";

/** Beacon from the public /demo page (one increment per page load). */
export async function POST() {
  await recordDemoPageLoad();
  return Response.json({ ok: true as const });
}
