import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { resolveFitRoomSmtpFrom } from "@/lib/fitRoomSmtp";
import {
  TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT,
  buildTryOnQuotaEightyPctEmailBody,
  getTryOnQuotaUpgradePlanUrl,
  sampleTryOnUsageCountAtLeastEightyPercent,
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

  const sampleUsed = sampleTryOnUsageCountAtLeastEightyPercent(usageLimit);
  const body = buildTryOnQuotaEightyPctEmailBody({
    storeName: previewStoreLabel,
    used: sampleUsed,
    limit: usageLimit,
  });

  return Response.json({
    subject: TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT,
    body,
    from: resolveFitRoomSmtpFrom(),
    upgradeUrl: getTryOnQuotaUpgradePlanUrl(),
    sampleUsed,
    sampleLimit: usageLimit,
    previewStoreLabel,
    caption:
      "Uses illustrative counts at roughly 80% of the plan's try-on limit — same plaintext template merchants receive.",
  });
}
