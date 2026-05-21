import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { resolveFitRoomEmailFrom } from "@/lib/fitRoomEmail";
import {
  buildTryOnQuotaUsageEmailBody,
  buildTryOnQuotaUsageEmailHtml,
  buildTryOnQuotaUsageEmailSubject,
  getTryOnQuotaUpgradePlanUrl,
  parseTryOnQuotaEmailToneParam,
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

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const tone = parseTryOnQuotaEmailToneParam(url.searchParams.get("tone"));

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

  const sampleUsed =
    tone === "atMonthlyCap"
      ? usageLimit
      : sampleTryOnUsageCountAtLeastSeventyFivePercent(usageLimit);
  const previewParams = {
    storeName: previewStoreLabel,
    used: sampleUsed,
    limit: usageLimit,
    tone,
  };
  const subject = buildTryOnQuotaUsageEmailSubject({ tone });
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
      tone === "atMonthlyCap"
        ? "Preview at monthly cap counts — multipart email matches the ~99% alert customers receive."
        : "Roughly 75%+ usage sample — multipart email matches the warming heads-up merchants receive.",
  });
}
