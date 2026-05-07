import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { resolveFitRoomEmailFrom } from "@/lib/fitRoomEmail";
import {
  TRY_ON_QUOTA_NEAR_LIMIT_EMAIL_SUBJECT_PREFIX,
  buildTryOnQuotaUsageEmailBody,
  buildTryOnQuotaUsageEmailHtml,
  getTryOnQuotaUpgradePlanUrl,
  sampleTryOnUsageCountAtLeastSeventyFivePercent,
} from "@/lib/usageTryOnQuotaEmail";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId")?.trim();

  let previewStoreLabel = "Example Boutique";
  let usageLimit = 1000;

  if (clientId) {
    const client = await getClientKeyRecordById(clientId);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }

    usageLimit = client.usageLimit;
    const retailers = await listRetailersLinkedToClientId(client.id);
    previewStoreLabel =
      retailers.find((r) => r.storeName.trim().length > 0)?.storeName.trim() ||
      client.clientName.trim() ||
      "your store";
  }

  const sampleUsed = sampleTryOnUsageCountAtLeastSeventyFivePercent(usageLimit);
  const previewParams = {
    storeName: previewStoreLabel,
    used: sampleUsed,
    limit: usageLimit,
  };
  const pct = Math.round(((sampleUsed / Math.max(1, usageLimit)) * 100) * 10) / 10;
  const pctLabel = Number.isInteger(pct) ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
  const subject = `${TRY_ON_QUOTA_NEAR_LIMIT_EMAIL_SUBJECT_PREFIX}${pctLabel} used`;
  const body = buildTryOnQuotaUsageEmailBody(previewParams);
  const html = buildTryOnQuotaUsageEmailHtml(previewParams);

  return Response.json({
    subject,
    body,
    html,
    from: resolveFitRoomEmailFrom(),
    upgradeUrl: getTryOnQuotaUpgradePlanUrl(),
    sampleUsed,
    sampleLimit: usageLimit,
    previewStoreLabel,
    caption:
      "Uses illustrative counts at roughly 75% of the plan's try-on limit — multipart email (HTML + plain text) matches what linked retailers receive.",
  });
}
