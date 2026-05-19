import { applyDueMonthlyUsageResetsForAllClients } from "@/lib/apiKeyStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron: daily at 00:00 UTC (see root `vercel.json`).
 * Applies monthly `usageCount` reset for clients whose billing anchor falls on today (UTC),
 * including end-of-month handling for anchors like 31 in shorter months.
 *
 * Set `CRON_SECRET` in Vercel project env; the cron request must send
 * `Authorization: Bearer <CRON_SECRET>` (Vercel does this when the secret is configured).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set.");
    return Response.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { examined, updated } = await applyDueMonthlyUsageResetsForAllClients();
    return Response.json({
      ok: true,
      examined,
      updated,
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[cron] monthly-usage-reset failed", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Cron run failed." },
      { status: 500 },
    );
  }
}
